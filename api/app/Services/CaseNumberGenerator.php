<?php

namespace App\Services;

use App\Models\CaseSequence;
use App\Models\Site;
use Carbon\CarbonInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Generates sequential per-site case numbers formatted as SL-{SITE_CODE}-{YEAR}-{0001}.
 */
class CaseNumberGenerator
{
    public function nextForSite(Site $site, CarbonInterface $reportedAt): string
    {
        $year = (int) $reportedAt->format('Y');

        return DB::transaction(function () use ($site, $year): string {
            $sequence = CaseSequence::query()
                ->where('site_id', $site->id)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $sequence) {
                try {
                    $sequence = CaseSequence::query()->create([
                        'organization_id' => $site->organization_id,
                        'site_id' => $site->id,
                        'year' => $year,
                        'last_sequence' => 0,
                    ]);
                } catch (QueryException) {
                    $sequence = CaseSequence::query()
                        ->where('site_id', $site->id)
                        ->where('year', $year)
                        ->lockForUpdate()
                        ->firstOrFail();
                }
            }

            $sequence->last_sequence += 1;
            $sequence->save();

            return sprintf('SL-%s-%04d-%04d', strtoupper($site->code), $year, $sequence->last_sequence);
        });
    }
}
