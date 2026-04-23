from django.conf import settings
from firebase_admin import firestore


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