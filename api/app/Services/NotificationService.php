<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\AppNotification;
use App\Models\CaseAction;
use App\Models\SafetyCase;
use App\Models\User;

class NotificationService
{
    public function notifyUser(
        int $userId,
        int $organizationId,
        string $type,
        string $title,
        ?string $body = null,
        ?SafetyCase $case = null,
        ?CaseAction $action = null,
    ): AppNotification {
        return AppNotification::query()->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'safety_case_id' => $case?->id,
            'case_action_id' => $action?->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
        ]);
    }

    /**
     * @param  list<int>  $excludeUserIds
     */
    public function notifyRole(
        int $organizationId,
        UserRole $role,
        string $type,
        string $title,
        ?string $body = null,
        ?SafetyCase $case = null,
        ?CaseAction $action = null,
        array $excludeUserIds = [],
    ): void {
        $recipientIds = User::query()
            ->forOrganization($organizationId)
            ->where('role', $role->value)
            ->where('is_active', true)
            ->when($excludeUserIds !== [], fn ($q) => $q->whereNotIn('id', $excludeUserIds))
            ->pluck('id');

        foreach ($recipientIds as $userId) {
            $this->notifyUser(
                userId: (int) $userId,
                organizationId: $organizationId,
                type: $type,
                title: $title,
                body: $body,
                case: $case,
                action: $action,
            );
        }
    }
}
