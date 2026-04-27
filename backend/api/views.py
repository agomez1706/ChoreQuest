import secrets
import string
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from firebase_admin import firestore
from .household_utils import _get_user_household_doc

def _hydrate_household(data, household_ref):
    """
    Transforms a list of member UIDs into full objects.
    Fetches user profiles from 'users' and join metadata from 'memberships' subcollection.
    """
    db = settings.FIREBASE_DB
    uids = data.get('members', [])
    admin_id = data.get('admin_id')
    
    if not uids or not household_ref:
        return data

    user_refs = [db.collection('users').document(uid) for uid in uids]
    user_docs = db.get_all(user_refs)
    
    membership_docs = household_ref.collection('memberships').get()
    
    join_dates = {}
    for m in membership_docs:
        m_data = m.to_dict()
        join_dates[m.id] = m_data.get('joined_at')

    hydrated_members = []
    valid_uids = []
    for doc in user_docs:
        if doc.exists:
            uid = doc.id
            user_info = doc.to_dict()
            
            ts = join_dates.get(uid)
            joined_at_str = ts.isoformat() if hasattr(ts, 'isoformat') else "Recently"

            valid_uids.append(uid)
            hydrated_members.append({
                "id": uid,
                "display_name": user_info.get('display_name', 'Unknown User'),
                "email": user_info.get('email', ''),
                "is_admin": uid == admin_id,
                "joined_at": joined_at_str
            })

    # Self-heal stale household docs when deleted accounts leave orphaned member IDs.
    stale_uids = [uid for uid in uids if uid not in set(valid_uids)]
    if stale_uids:
        if not valid_uids:
            household_ref.delete()
            return None

        updates = {
            'members': valid_uids,
            'member_count': len(valid_uids),
            'is_full': len(valid_uids) >= 6,
        }

        if admin_id not in valid_uids:
            updates['admin_id'] = valid_uids[0]

        household_ref.update(updates)

        for stale_uid in stale_uids:
            household_ref.collection('memberships').document(stale_uid).delete()

        data.update(updates)

    data['members'] = hydrated_members
    return data

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """
    Returns the current user's profile from the 'users' collection.
    """
    uid = request.user.username
    db = settings.FIREBASE_DB
    user_doc = db.collection('users').document(uid).get()
    
    if not user_doc.exists:
        return Response({'detail': 'User profile not found.'}, status=404)
        
    return Response(user_doc.to_dict(), status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_household(request):
    """
    Creates a new household and initializes the admin membership subcollection.
    """
    uid = request.user.username
    
    existing_data, _ = _get_user_household_doc(uid)
    if existing_data:
        return Response({'detail': 'You are already in a household. Leave it first.'}, status=400)
    
    name = request.data.get('name', '').strip()
    if not name or len(name) < 3:
        return Response({'detail': 'Household name must be at least 3 characters.'}, status=400)

    db = settings.FIREBASE_DB
    
    alphabet = string.ascii_uppercase + string.digits
    invite_code = ''.join(secrets.choice(alphabet) for _ in range(6))
    
    household_data = {
        "name": name,
        "invite_code": invite_code,
        "admin_id": uid,
        "member_count": 1,
        "is_full": False,
        "members": [uid]
    }
    
    _, doc_ref = db.collection('households').add(household_data)
    
    doc_ref.collection('memberships').document(uid).set({
        'joined_at': firestore.SERVER_TIMESTAMP,
        'role': 'admin'
    })
    
    household_data['id'] = doc_ref.id
    return Response(_hydrate_household(household_data, doc_ref), status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_household(request):
    """
    Joins an existing household via invite code and updates the subcollection.
    """
    uid = request.user.username
    
    existing_data, _ = _get_user_household_doc(uid)
    if existing_data:
        return Response({'detail': 'You are already in a household.'}, status=400)
    
    invite_code = request.data.get('invite_code', '').upper().strip()
    db = settings.FIREBASE_DB
    
    docs = db.collection('households').where(
        filter=firestore.FieldFilter('invite_code', '==', invite_code)
    ).limit(1).stream()
    
    doc_ref = None
    data = None
    for doc in docs:
        doc_ref = doc.reference
        data = doc.to_dict()
        
    if not doc_ref:
        return Response({'detail': 'Invalid invite code.'}, status=404)
        
    if data.get('is_full') or data.get('member_count', 0) >= 6:
        return Response({'detail': 'This household is full.'}, status=400)
        
    new_count = data.get('member_count', 0) + 1
    
    doc_ref.update({
        'members': firestore.ArrayUnion([uid]),
        'member_count': new_count,
        'is_full': new_count >= 6
    })
    
    doc_ref.collection('memberships').document(uid).set({
        'joined_at': firestore.SERVER_TIMESTAMP,
        'role': 'member'
    })
    
    data['id'] = doc_ref.id
    data['members'].append(uid) 
    return Response(_hydrate_household(data, doc_ref), status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_household(request):
    """
    Fetches the user's current household with full member details.
    """
    data, doc_ref = _get_user_household_doc(request.user.username)
    if not data:
        return Response(None, status=200)
    
    hydrated = _hydrate_household(data, doc_ref)
    if hydrated is None:
        return Response(None, status=200)
    return Response(hydrated, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_household(request):
    """
    Removes user from the household and deletes their membership subcollection doc.
    """
    uid = request.user.username
    data, doc_ref = _get_user_household_doc(uid)
    
    if not data or not doc_ref:
        return Response({'detail': 'Not in any household.'}, status=400)
        
    member_count = data.get('member_count', 1)
    is_admin = data.get('admin_id') == uid
    
    if is_admin and member_count > 1:
        return Response({'detail': 'Transfer admin rights before leaving.'}, status=400)
        
    if is_admin and member_count == 1:
        doc_ref.delete()
        return Response({'detail': 'Household dissolved.'}, status=200)
        
    admin_id = data.get('admin_id')
    
    # Reassign the departing member's tasks to the admin
    tasks = doc_ref.collection('tasks').where('assigned_to', '==', uid).stream()
    for task in tasks:
        if task.to_dict().get('status') != 'completed':
            task.reference.update({'assigned_to': admin_id})

    doc_ref.update({
        'members': firestore.ArrayRemove([uid]),
        'member_count': member_count - 1,
        'is_full': False
    })
    doc_ref.collection('memberships').document(uid).delete()
    
    return Response({'detail': 'You have left the household.'}, status=200)