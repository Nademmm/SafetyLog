<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS safety_cases_description_trgm_idx ON safety_cases USING gin (description gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS safety_cases_case_number_trgm_idx ON safety_cases USING gin (case_number gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS machines_name_trgm_idx ON machines USING gin (name gin_trgm_ops)');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS machines_name_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS safety_cases_case_number_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS safety_cases_description_trgm_idx');
    }
};
