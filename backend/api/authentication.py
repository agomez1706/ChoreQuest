from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from firebase_admin import auth, firestore
from django.contrib.auth.models import User
from django.conf import settings

class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email', '')
            
            user, created = User.objects.get_or_create(
                username=uid, 
                defaults={'email': email}
            )

            db = settings.FIREBASE_DB
            user_ref = db.collection('users').document(uid)
            user_doc = user_ref.get()

            if not user_doc.exists:
                name_from_token = decoded_token.get('name')
                email_prefix = email.split('@')[0] if '@' in email else None
                fallback_name = name_from_token or email_prefix or "ChoreQuester"

                user_ref.set({
                    'uid': uid,
                    'email': email,
                    'display_name': fallback_name,
                    'photo_url': decoded_token.get('picture', ''),
                    'points': 0,
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'role': 'member'
                })
            
            return (user, token)
            
        except Exception as e:
            raise AuthenticationFailed(f'Invalid Firebase token: {str(e)}')