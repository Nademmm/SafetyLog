<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

trait ValidatesPhotoUploads
{
    /**
     * @return array<string, mixed>
     */
    protected function photoUploadRules(): array
    {
        $imageRule = File::image()
            ->types(['jpg', 'jpeg', 'png', 'webp'])
            ->max(5 * 1024);

        return [
            'photo' => ['nullable', $imageRule],
            'photos' => ['nullable', 'array', 'max:5'],
            'photos.*' => [$imageRule],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function photoUploadMessages(): array
    {
        return [
            'photos.max' => 'Maksimal 5 foto yang dapat diunggah sekaligus.',
            'photos.*.image' => 'Berkas yang diunggah harus berupa gambar yang valid.',
            'photos.*.mimes' => 'Format foto harus JPG, PNG, atau WebP.',
            'photos.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
            'photo.image' => 'Berkas yang diunggah harus berupa gambar yang valid.',
            'photo.mimes' => 'Format foto harus JPG, PNG, atau WebP.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $count = count((array) $this->file('photos', [])) + ($this->hasFile('photo') ? 1 : 0);
            if ($count > 5) {
                $validator->errors()->add('photos', 'Total foto yang diunggah dalam satu permintaan maksimal 5 berkas.');
            }
        });
    }
}
