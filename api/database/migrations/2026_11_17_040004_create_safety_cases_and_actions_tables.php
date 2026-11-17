<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();

            $table->unique(['site_id', 'year']);
        });

        Schema::create('safety_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->foreignId('area_id')->constrained()->cascadeOnDelete();
            $table->foreignId('machine_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('case_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('case_number', 64)->unique();
            $table->text('description');
            $table->boolean('is_machine_stopped')->default(false);
            $table->boolean('has_affected_people')->default(false);
            $table->string('status', 32)->default('new');

            // Triage & risk assessment (B-12)
            $table->unsignedTinyInteger('severity')->nullable();
            $table->unsignedTinyInteger('likelihood')->nullable();
            $table->unsignedSmallInteger('risk_score')->nullable();
            $table->string('risk_level', 32)->nullable();
            $table->foreignId('assigned_pic_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('triaged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('triaged_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('duplicate_of_case_id')->nullable()->constrained('safety_cases')->nullOnDelete();

            // Root cause analysis (B-13)
            $table->string('root_cause_category', 64)->nullable();
            $table->json('five_whys')->nullable();
            $table->text('root_cause_summary')->nullable();
            $table->foreignId('analyzed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('analyzed_at')->nullable();

            // Verification, closing, & reopening (B-16, B-17)
            $table->text('learning_summary')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->boolean('is_locked')->default(false);
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reopened_at')->nullable();
            $table->text('reopen_reason')->nullable();

            $table->timestamp('reported_at')->useCurrent();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'machine_id', 'reported_at']);
            $table->index(['organization_id', 'reporter_id']);
            $table->index(['organization_id', 'risk_level']);
        });

        Schema::create('case_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('safety_case_id')->constrained()->cascadeOnDelete();
            $table->string('action_type', 32);
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('pic_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('due_at');
            $table->string('status', 32)->default('open');
            $table->text('completion_note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'pic_user_id', 'status', 'due_at']);
            $table->index(['safety_case_id', 'status']);
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->morphs('attachable');
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32)->default('local');
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->unsignedInteger('file_size');
            $table->timestamps();

            $table->index(['organization_id', 'attachable_type', 'attachable_id']);
        });

        Schema::create('case_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('safety_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->string('action_name', 64);
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['organization_id', 'safety_case_id', 'created_at']);
        });

        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('safety_case_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('case_action_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('title');
            $table->text('body')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
        Schema::dropIfExists('case_status_histories');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('case_actions');
        Schema::dropIfExists('safety_cases');
        Schema::dropIfExists('case_sequences');
    }
};
