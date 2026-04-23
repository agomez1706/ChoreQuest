from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from firebase_admin import firestore
import uuid
from datetime import datetime


def _get_user_household_doc(uid):
    """
    Helper to find the household document where the user is a member.
    Returns (data_dict, document_reference)
    """
    db = settings.FIREBASE_DB
    docs = db.collection('households').where(
        filter=firestore.FieldFilter('members', 'array_contains', uid)
    ).limit(1).stream()

    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        return data, doc.reference

    return None, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_task(request):
    """
    Admin-only. Creates a new task in the household's 'tasks' subcollection.
    """
    uid = request.user.username
    db = settings.FIREBASE_DB

    household_data, household_ref = _get_user_household_doc(uid)
    if not household_data:
        return Response({'detail': 'You are not in a household.'}, status=400)

    if household_data.get('admin_id') != uid:
        return Response({'detail': 'Only the household admin can create tasks.'}, status=403)

    title = request.data.get('title', '').strip()
    assigned_to = request.data.get('assigned_to', '').strip()
    due_date_str = request.data.get('due_date', '').strip()
    difficulty = request.data.get('difficulty', 'Easy').strip()

    if not title:
        return Response({'detail': 'Task title is required.'}, status=400)
    if not assigned_to:
        return Response({'detail': 'assigned_to (uid) is required.'}, status=400)
    if difficulty not in ['Easy', 'Medium', 'Hard']:
        return Response({'detail': 'Difficulty must be Easy, Medium, or Hard.'}, status=400)

    # Verify assigned_to is a member of this household
    if assigned_to not in household_data.get('members', []):
        return Response({'detail': 'Assigned user is not a member of this household.'}, status=400)

    # Fetch assigned user's display name
    assigned_user_doc = db.collection('users').document(assigned_to).get()
    if not assigned_user_doc.exists:
        return Response({'detail': 'Assigned user not found.'}, status=404)
    assigned_to_name = assigned_user_doc.to_dict().get('display_name', 'Unknown')

    # Parse due date
    try:
        due_date = datetime.fromisoformat(due_date_str) if due_date_str else None
    except ValueError:
        return Response({'detail': 'Invalid due_date format. Use ISO 8601 (YYYY-MM-DD).'}, status=400)

    task_id = str(uuid.uuid4())
    task_data = {
        'id': task_id,
        'title': title,
        'assigned_to': assigned_to,
        'assigned_to_name': assigned_to_name,
        'created_by': uid,
        'due_date': due_date,
        'difficulty': difficulty,
        'status': 'pending',
        'created_at': firestore.SERVER_TIMESTAMP,
    }

    household_ref.collection('tasks').document(task_id).set(task_data)

    # Return serializable version
    task_data['due_date'] = due_date_str if due_date_str else None
    task_data['created_at'] = datetime.utcnow().isoformat()

    return Response(task_data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_household_tasks(request):
    """
    Returns all tasks for the current user's household.
    """
    uid = request.user.username

    household_data, household_ref = _get_user_household_doc(uid)
    if not household_data:
        return Response({'detail': 'You are not in a household.'}, status=400)

    task_docs = household_ref.collection('tasks').order_by(
        'created_at', direction=firestore.Query.DESCENDING
    ).stream()

    tasks = []
    for doc in task_docs:
        task = doc.to_dict()
        # Serialize Firestore timestamps
        if hasattr(task.get('due_date'), 'isoformat'):
            task['due_date'] = task['due_date'].isoformat()
        if hasattr(task.get('created_at'), 'isoformat'):
            task['created_at'] = task['created_at'].isoformat()
        tasks.append(task)

    return Response(tasks, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_task(request, task_id):
    """
    Marks a task as completed. Only the assigned user can complete it.
    """
    uid = request.user.username

    household_data, household_ref = _get_user_household_doc(uid)
    if not household_data:
        return Response({'detail': 'You are not in a household.'}, status=400)

    task_ref = household_ref.collection('tasks').document(task_id)
    task_doc = task_ref.get()

    if not task_doc.exists:
        return Response({'detail': 'Task not found.'}, status=404)

    task = task_doc.to_dict()

    if task.get('assigned_to') != uid:
        return Response({'detail': 'Only the assigned user can complete this task.'}, status=403)

    if task.get('status') == 'completed':
        return Response({'detail': 'Task is already completed.'}, status=400)

    task_ref.update({
        'status': 'completed',
        'completed_at': firestore.SERVER_TIMESTAMP,
    })

    return Response({'detail': 'Task marked as completed.'}, status=200)
