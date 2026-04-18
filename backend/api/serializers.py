from rest_framework import serializers
from .models import Household, HouseholdMembership


class MemberSerializer(serializers.ModelSerializer):
    id           = serializers.IntegerField(source='user.id')
    display_name = serializers.CharField(source='user.username')
    email        = serializers.EmailField(source='user.email')
    is_admin     = serializers.SerializerMethodField()
    joined_at    = serializers.DateTimeField()

    class Meta:
        model  = HouseholdMembership
        fields = ['id', 'display_name', 'email', 'is_admin', 'joined_at']

    def get_is_admin(self, obj):
        return obj.user == obj.household.admin


class HouseholdSerializer(serializers.ModelSerializer):
    members      = MemberSerializer(source='memberships', many=True, read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_full      = serializers.BooleanField(read_only=True)
    admin_id     = serializers.IntegerField(source='admin.id', read_only=True)

    class Meta:
        model  = Household
        fields = ['id', 'name', 'invite_code', 'admin_id', 'member_count',
                  'is_full', 'members', 'created_at']
        read_only_fields = ['invite_code', 'admin_id', 'member_count',
                            'is_full', 'members', 'created_at']


class CreateHouseholdSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)


class JoinHouseholdSerializer(serializers.Serializer):
    invite_code = serializers.CharField(min_length=6, max_length=6)