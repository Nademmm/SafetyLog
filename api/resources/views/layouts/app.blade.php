<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @if (session('sl_token'))
        <meta name="sl-token" content="{{ session('sl_token') }}">
        <meta name="sl-user" content='{{ json_encode(session('sl_user')) }}'>
    @endif
    <title>{{ $title ?? 'SafetyLog' }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>
<body>
    @yield('content')

    <script src="{{ asset('js/api.js') }}"></script>
    <script src="{{ asset('js/auth.js') }}"></script>
    <script src="{{ asset('js/guard.js') }}"></script>
    @yield('scripts')
</body>
</html>
