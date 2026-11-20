<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('safety_cases', function (Blueprint $table) {
            $table->dropUnique(['case_number']);
            $table->unique(['organization_id', 'case_number'], 'safety_cases_org_case_number_unique');
            $table->index(['organization_id', 'site_id', 'status'], 'safety_cases_org_site_status_idx');
            $table->index(['organization_id', 'status', 'closed_at'], 'safety_cases_org_status_closed_idx');
        });

        Schema::table('case_actions', function (Blueprint $table) {
            $table->index(['organization_id', 'status', 'due_at'], 'case_actions_org_status_due_idx');
        });

        Schema::table('case_status_histories', function (Blueprint $table) {
            $table->index(['organization_id', 'created_at', 'id'], 'case_histories_org_created_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_safety_cases_root_cause_trgm ON safety_cases USING GIN (root_cause_summary gin_trgm_ops)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_safety_cases_learning_trgm ON safety_cases USING GIN (learning_summary gin_trgm_ops)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_machines_code_trgm ON machines USING GIN (code gin_trgm_ops)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_machines_code_trgm');
            DB::statement('DROP INDEX IF EXISTS idx_safety_cases_learning_trgm');
            DB::statement('DROP INDEX IF EXISTS idx_safety_cases_root_cause_trgm');
        }

        Schema::table('case_status_histories', function (Blueprint $table) {
            $table->dropIndex('case_histories_org_created_idx');
        });

        Schema::table('case_actions', function (Blueprint $table) {
            $table->dropIndex('case_actions_org_status_due_idx');
        });

        Schema::table('safety_cases', function (Blueprint $table) {
            $table->dropIndex('safety_cases_org_status_closed_idx');
            $table->dropIndex('safety_cases_org_site_status_idx');
            $table->dropUnique('safety_cases_org_case_number_unique');
            $table->unique('case_number');
        });
    }
};
