<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 32)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->nullable()->after('organization_id')->constrained()->nullOnDelete();
            $table->string('role', 32)->default('reporter')->after('password');
            $table->string('job_title')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('job_title');

            $table->index(['organization_id', 'role', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'role', 'is_active']);
            $table->dropConstrainedForeignId('site_id');
            $table->dropConstrainedForeignId('organization_id');
            $table->dropColumn(['role', 'job_title', 'is_active']);
        });

        Schema::dropIfExists('roles');
    }
};
