<?php

namespace App\Services;

use App\Models\CaseSequence;
use App\Models\Site;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Generates sequential per-site case numbers formatted as SL-{SITE_CODE}-{YEAR}-{0001}.
 * Uses insertOrIgnore + lockForUpdate so concurrent requests never abort PostgreSQL transactions (25P02).
 */
class CaseNumberGenerator
{
    public function nextForSite(Site $site, CarbonInterface $reportedAt): string
    {
        $year = (int) $reportedAt->format('Y');

        return DB::transaction(function () use ($site, $year): string {
            $now = now();

            CaseSequence::query()->insertOrIgnore([
                'organization_id' => $site->organization_id,
                'site_id' => $site->id,
                'year' => $year,
                'last_sequence' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $sequence = CaseSequence::query()
                ->where('site_id', $site->id)
                ->where('year', $year)
                ->lockForUpdate()
                ->firstOrFail();

            $sequence->last_sequence += 1;
            $sequence->save();

            return sprintf('SL-%s-%04d-%04d', strtoupper($site->code), $year, $sequence->last_sequence);
        });
    }
}
