<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ResetDemoCommand extends Command
{
    protected $signature = 'safetylog:reset-demo {--force : Jalankan tanpa konfirmasi interaktif}';

    protected $description = 'Membangun ulang database SafetyLog dari awal dengan data demo lengkap (10 mesin, 30 kasus).';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('Reset seluruh database lokal/staging dan isi ulang data demo?')) {
            $this->info('Dibatalkan.');

            return self::SUCCESS;
        }

        $this->call('migrate:fresh', [
            '--seed' => true,
            '--seeder' => 'DemoSeeder',
            '--force' => true,
        ]);

        $this->info('Database demo SafetyLog berhasil di-reset dan diisi ulang.');

        return self::SUCCESS;
    }
}
