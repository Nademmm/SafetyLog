<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

abstract class Controller
{
    /**
     * Collect uploaded image files from either `photos[]` or single `photo`.
     *
     * @return list<UploadedFile>
     */
    protected function extractUploadedPhotos(Request $request): array
    {
        $files = [];

        if ($request->hasFile('photos')) {
            foreach ((array) $request->file('photos') as $file) {
                if ($file instanceof UploadedFile) {
                    $files[] = $file;
                }
            }
        }

        if ($request->hasFile('photo') && $request->file('photo') instanceof UploadedFile) {
            $files[] = $request->file('photo');
        }

        return $files;
    }
}
