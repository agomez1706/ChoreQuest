import random
import string
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()
MAX_HOUSEHOLD_MEMBERS = 6


def generate_invite_code():
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        if not Household.objects.filter(invite_code=code).exists():
            return code


class Household(models.Model):
    name        = models.CharField(max_length=100)
    invite_code = models.CharField(max_length=6, unique=True, default=generate_invite_code)
    admin       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='administered_households')
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.invite_code})"

    @property
    def member_count(self):
        return self.memberships.count()

    @property
    def is_full(self):
        return self.member_count >= MAX_HOUSEHOLD_MEMBERS


class HouseholdMembership(models.Model):
    household = models.ForeignKey(Household, on_delete=models.CASCADE, related_name='memberships')
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('household', 'user')

    def __str__(self):
        return f"{self.user} in {self.household}"
