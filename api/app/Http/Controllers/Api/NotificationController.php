<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActionStatus;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\CaseAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AppNotification::query()
            ->forOrganization($user->organization_id)
            ->where('user_id', $user->id)
            ->with([
                'safetyCase:id,case_number,status',
                'caseAction:id,title,due_at,status',
            ])
            ->latest('id');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate(min(100, max(1, (int) $request->integer('per_page', 20))));

        $unreadCount = AppNotification::query()
            ->forOrganization($user->organization_id)
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        $overdueActionsCount = CaseAction::query()
            ->forOrganization($user->organization_id)
            ->where('pic_user_id', $user->id)
            ->where('status', ActionStatus::Open->value)
            ->where('due_at', '<', now())
            ->count();

        $dueSoonActionsCount = CaseAction::query()
            ->forOrganization($user->organization_id)
            ->where('pic_user_id', $user->id)
            ->where('status', ActionStatus::Open->value)
            ->whereBetween('due_at', [now(), now()->addHours(24)])
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'action_alerts' => [
                'overdue_count' => $overdueActionsCount,
                'due_within_24h_count' => $dueSoonActionsCount,
            ],
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $user = $request->user();
        if ($notification->organization_id !== $user->organization_id || $notification->user_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke notifikasi ini.');
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notifikasi ditandai sudah dibaca.',
            'data' => $notification->fresh(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        $updated = AppNotification::query()
            ->forOrganization($user->organization_id)
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Semua notifikasi ditandai sudah dibaca.',
            'marked_count' => $updated,
        ]);
    }
}
