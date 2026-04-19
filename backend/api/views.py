from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Household, HouseholdMembership
from rest_framework.response import Response
from django.db import IntegrityError
from .serializers import (
    HouseholdSerializer,
    CreateHouseholdSerializer,
    JoinHouseholdSerializer,
)


def _get_user_household(user):
    membership = user.memberships.select_related('household').first()
    return membership.household if membership else None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_household(request):
    if _get_user_household(request.user):
        return Response({'detail': 'You are already in a household. Leave it first.'}, status=400)
    serializer = JoinHouseholdSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code      = serializer.validated_data['invite_code'].upper()
    household = Household.objects.filter(invite_code=code).first()
    if not household:
        return Response({'detail': 'Invalid invite code.'}, status=404)
    if household.is_full:
        return Response({'detail': f'This household is full ({household.member_count}/6).'}, status=400)
    try:
        HouseholdMembership.objects.create(household=household, user=request.user)
    except IntegrityError:
        return Response({'detail': 'Could not join household. It may now be full.'}, status=400)
    return Response(HouseholdSerializer(household).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_household(request):
    if _get_user_household(request.user):
        return Response({'detail': 'You are already in a household. Leave it first.'}, status=400)
    serializer = JoinHouseholdSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code      = serializer.validated_data['invite_code'].upper()
    household = Household.objects.filter(invite_code=code).first()
    if not household:
        return Response({'detail': 'Invalid invite code.'}, status=404)
    if household.is_full:
        return Response({'detail': f'This household is full ({household.member_count}/6).'}, status=400)
    HouseholdMembership.objects.create(household=household, user=request.user)
    return Response(HouseholdSerializer(household).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_household(request):
    household = _get_user_household(request.user)
    if not household:
        return Response({'detail': 'Not in any household.'}, status=404)
    return Response(HouseholdSerializer(household).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_household(request):
    household = _get_user_household(request.user)
    if not household:
        return Response({'detail': 'Not in any household.'}, status=400)
    if household.admin == request.user and household.member_count > 1:
        return Response({'detail': 'Transfer admin rights before leaving.'}, status=400)
    if household.admin == request.user and household.member_count == 1:
        household.delete()
        return Response({'detail': 'Household dissolved.'})
    HouseholdMembership.objects.filter(household=household, user=request.user).delete()
    return Response({'detail': 'You have left the household.'})
