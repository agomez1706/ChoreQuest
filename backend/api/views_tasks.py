from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from firebase_admin import firestore
import uuid
from datetime import datetime, timezone, timedelta
from .household_utils import _get_user_household_doc


def _serialize_task(task):
    """
    Convert Firestore datetime values into JSON-serializable ISO strings.
    """
    if hasattr(task.get('due_date'), 'isoformat'):
        task['due_date'] = task['due_date'].isoformat()
    if hasattr(task.get('created_at'), 'isoformat'):
        task['created_at'] = task['created_at'].isoformat()
    return task


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

    # Points
    try:
        points = int(request.data.get('points', 0))
        if points < 0:
            return Response({'detail': 'Points cannot be negative.'}, status=400)
    except (ValueError, TypeError):
        return Response({'detail': 'Points must be a whole number.'}, status=400)

    # Recurring fields
    is_recurring = bool(request.data.get('is_recurring', False))
    recurrence_interval_days = None
    if is_recurring:
        try:
            recurrence_interval_days = int(request.data.get('recurrence_interval_days', 0))
            if recurrence_interval_days < 1:
                return Response(
                    {'detail': 'Recurrence interval must be at least 1 day.'},
                    status=400
                )
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Recurrence interval must be a whole number of days.'},
                status=400
            )

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
        if due_date_str:
            clean_date = due_date_str.split('T')[0]
            due_date = datetime.strptime(clean_date, "%Y-%m-%d").replace(hour=12)
            due_date = due_date.replace(tzinfo=timezone.utc)
        else:
            due_date = None
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
        'points': points,
        'status': 'pending',
        'is_recurring': is_recurring,
        'recurrence_interval_days': recurrence_interval_days,
        'created_at': firestore.SERVER_TIMESTAMP,
    }

    write_result = household_ref.collection('tasks').document(task_id).set(task_data)

    response_task_data = dict(task_data)
    response_task_data['created_at'] = getattr(write_result, 'update_time', None)
    response_task_data = _serialize_task(response_task_data)

    return Response(response_task_data, status=201)


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
        # Backwards compatibility for tasks created before these fields existed
        if 'points' not in task:
            task['points'] = 0
        if 'is_recurring' not in task:
            task['is_recurring'] = False
        if 'recurrence_interval_days' not in task:
            task['recurrence_interval_days'] = None
        tasks.append(_serialize_task(task))

    return Response(tasks, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_task(request, task_id):
    """
    Marks a task as completed. Only the assigned user can complete it.
    Awards points to the user.

    If the task is recurring:
      - Resets status back to 'pending'
      - Advances due_date by recurrence_interval_days
      - Points are still awarded for the completion

    Uses a Firestore transaction for atomicity.
    """
    uid = request.user.username
    db = settings.FIREBASE_DB

    client_due_date_str = request.data.get('due_date', '').strip()

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

    @firestore.transactional
    def update_task_and_award_points(transaction):
        task_doc_tx = task_ref.get(transaction=transaction)
        if not task_doc_tx.exists:
            raise ValueError('Task not found.')

        task_tx = task_doc_tx.to_dict()

        if task_tx.get('status') == 'completed':
            raise ValueError('Task is already completed.')

        is_recurring = task_tx.get('is_recurring', False)
        db_due_date = task_tx.get('due_date')

        if is_recurring:
            if client_due_date_str and db_due_date:
                client_date_only = client_due_date_str.split('T')[0]
                
                if hasattr(db_due_date, 'strftime'):
                    db_date_only = db_due_date.strftime('%Y-%m-%d')
                else:
                    db_date_only = str(db_due_date).split('T')[0]
                    
                if client_date_only != db_date_only:
                    raise ValueError('Task cycle mismatch. This cycle was already completed.')

            last_completed = task_tx.get('completed_at')
            if last_completed:
                try:
                    if isinstance(last_completed, str):
                        last_dt = datetime.fromisoformat(last_completed.replace('Z', '+00:00'))
                    else:
                        last_dt = last_completed
                    
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)

                    now = datetime.now(timezone.utc)
                    if (now - last_dt).total_seconds() < 5:
                        raise ValueError('Task was just completed. Please wait before completing again.')
                except (TypeError, ValueError, AttributeError):
                    pass # Ignore unparseable datatypes instead of crashing

        # Normalize points
        points_to_award = task_tx.get('points', 0)
        try:
            points_to_award = max(0, int(points_to_award))
        except (ValueError, TypeError):
            points_to_award = 0

        interval = task_tx.get('recurrence_interval_days', None)
        updated_task_data = task_tx.copy()

        if is_recurring and interval and int(interval) >= 1:
            if hasattr(db_due_date, 'isoformat'):
                base_date = db_due_date
            elif isinstance(db_due_date, str):
                try:
                    base_date = datetime.fromisoformat(db_due_date.replace('Z', '+00:00'))
                except ValueError:
                    base_date = datetime.now(timezone.utc)
            else:
                base_date = datetime.now(timezone.utc)

            # Ensure timezone awareness for math
            if base_date.tzinfo is None:
                base_date = base_date.replace(tzinfo=timezone.utc)

            now_utc = datetime.now(timezone.utc)
            if base_date < now_utc:
                base_date = now_utc

            new_due_date = base_date + timedelta(days=int(interval))

            updates = {
                'status': 'pending',
                'due_date': new_due_date,
                'completed_at': firestore.SERVER_TIMESTAMP,
                'points_awarded': True,
            }
        else:
            updates = {
                'status': 'completed',
                'completed_at': firestore.SERVER_TIMESTAMP,
                'points_awarded': True,
            }

        transaction.update(task_ref, updates)
        updated_task_data.update(updates)

        if points_to_award > 0:
            user_ref = db.collection('users').document(uid)
            transaction.update(user_ref, {
                'points': firestore.Increment(points_to_award)
            })

        return points_to_award, is_recurring, updated_task_data

    try:
        transaction = db.transaction()
        
        points_awarded, is_recurring, updated_task = update_task_and_award_points(transaction)
        
        if updated_task.get('completed_at') == firestore.SERVER_TIMESTAMP:
            updated_task['completed_at'] = datetime.now(timezone.utc)
            
        serialized_task = _serialize_task(updated_task)

        return Response({
            'detail': 'Task completed.' if not is_recurring else 'Task completed and reset for next cycle.',
            'points_awarded': points_awarded,
            'is_recurring': is_recurring,
            'task': serialized_task
        }, status=200)
        
    except ValueError as e:
        if 'already completed' in str(e) or 'cycle mismatch' in str(e):
            return Response({'detail': str(e)}, status=400)
        if 'wait before completing' in str(e):
            return Response({'detail': str(e)}, status=429)
        return Response({'detail': str(e)}, status=400)
    
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_task(request, task_id):
    """
    Admin-only. Edits an existing task in the household.
    """
    uid = request.user.username
    db = settings.FIREBASE_DB

    household_data, household_ref = _get_user_household_doc(uid)
    if not household_data:
        return Response({'detail': 'You are not in a household.'}, status=400)

    if household_data.get('admin_id') != uid:
        return Response({'detail': 'Only the household admin can edit tasks.'}, status=403)

    task_ref = household_ref.collection('tasks').document(task_id)
    task_doc = task_ref.get()
    
    if not task_doc.exists:
        return Response({'detail': 'Task not found.'}, status=404)
        
    current_task_data = task_doc.to_dict()
    title = request.data.get('title', current_task_data.get('title', '')).strip()
    assigned_to = request.data.get('assigned_to', current_task_data.get('assigned_to', '')).strip()
    due_date_str = request.data.get('due_date', '')
    difficulty = request.data.get('difficulty', current_task_data.get('difficulty')).strip()

    # Points Validation
    try:
        points = int(request.data.get('points', current_task_data.get('points', 0)))
        if points < 0:
            return Response({'detail': 'Points cannot be negative.'}, status=400)
    except (ValueError, TypeError):
        return Response({'detail': 'Points must be a whole number.'}, status=400)

    # Recurring Logic Verification
    is_recurring = bool(request.data.get('is_recurring', current_task_data.get('is_recurring', False)))
    recurrence_interval_days = None
    
    if is_recurring:
        try:
            recurrence_interval_days = int(request.data.get('recurrence_interval_days', 0))
            if recurrence_interval_days < 1:
                return Response({'detail': 'Recurrence interval must be at least 1 day.'}, status=400)
        except (ValueError, TypeError):
            return Response({'detail': 'Recurrence interval must be a whole number of days.'}, status=400)

    # Basic Field Validation
    if not title:
        return Response({'detail': 'Task title is required.'}, status=400)
    if not assigned_to:
        return Response({'detail': 'assigned_to (uid) is required.'}, status=400)
    if difficulty not in ['Easy', 'Medium', 'Hard']:
        return Response({'detail': 'Difficulty must be Easy, Medium, or Hard.'}, status=400)
    if assigned_to not in household_data.get('members', []):
        return Response({'detail': 'Assigned user is not a member of this household.'}, status=400)

    assigned_to_name = current_task_data.get('assigned_to_name', 'Unknown')
    if assigned_to != current_task_data.get('assigned_to'):
        assigned_user_doc = db.collection('users').document(assigned_to).get()
        if not assigned_user_doc.exists:
            return Response({'detail': 'Assigned user not found.'}, status=404)
        assigned_to_name = assigned_user_doc.to_dict().get('display_name', 'Unknown')

    if due_date_str:
        try:
            clean_date = due_date_str.split('T')[0]
            due_date = datetime.strptime(clean_date, "%Y-%m-%d").replace(hour=12)
            due_date = due_date.replace(tzinfo=timezone.utc)
        except ValueError:
            return Response({'detail': 'Invalid due_date format. Use ISO 8601 (YYYY-MM-DD).'}, status=400)
    else:
        due_date = current_task_data.get('due_date')

    updates = {
        'title': title,
        'assigned_to': assigned_to,
        'assigned_to_name': assigned_to_name,
        'due_date': due_date,
        'difficulty': difficulty,
        'points': points,
        'is_recurring': is_recurring,
        'recurrence_interval_days': recurrence_interval_days,
        'updated_at': firestore.SERVER_TIMESTAMP,
    }

    write_result = task_ref.update(updates)

    updated_task_data = current_task_data.copy()
    updated_task_data.update(updates)
    updated_task_data['updated_at'] = getattr(write_result, 'update_time', datetime.now(timezone.utc))
    
    response_data = _serialize_task(updated_task_data)

    return Response(response_data, status=200)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_task(request, task_id):
    """
    Admin-only. Deletes a task from the household.
    """
    uid = request.user.username
    db = settings.FIREBASE_DB

    household_data, household_ref = _get_user_household_doc(uid)
    if not household_data:
        return Response({'detail': 'You are not in a household.'}, status=400)

    if household_data.get('admin_id') != uid:
        return Response({'detail': 'Only the household admin can delete tasks.'}, status=403)

    task_ref = household_ref.collection('tasks').document(task_id)
    if not task_ref.get().exists:
        return Response({'detail': 'Task not found.'}, status=404)

    task_ref.delete()
    return Response({'detail': 'Task deleted successfully.'}, status=200)