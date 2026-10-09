<?php
declare(strict_types=1);

if (!isset($authPage) || !in_array($authPage, ['login', 'register'], true)) {
    http_response_code(404);
    exit;
}

$registering = $authPage === 'register';
$title = $registering ? 'Create your account' : 'Welcome back';
$subtitle = $registering
    ? 'Start tracking every litre and stay ahead of leaks.'
    : 'Sign in to see what your water system is doing right now.';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f0f9ff">
  <meta name="color-scheme" content="light">
  <meta name="description" content="Sign in to AquaSense to monitor water usage and leakage alerts.">
  <title><?= $registering ? 'Register' : 'Log in' ?> · AquaSense</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;family=Outfit:wght@500;600;700&amp;family=Work+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/auth.css">
</head>
<body data-auth-page="<?= $authPage ?>">
  <a class="skip-link" href="#auth-main">Skip to form</a>
  <div class="auth-shell">
    <section class="story-panel" aria-labelledby="story-title">
      <a class="brand" href="login.php" aria-label="AquaSense sign in">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.5S5.5 9.4 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.5 12 2.5Z"/><path d="M9 15.2a3.2 3.2 0 0 0 3.1 2.4"/></svg></span>
        <span><strong>AQUASENSE</strong><small>Water observatory</small></span>
      </a>
      <div class="story-copy">
        <span class="story-kicker"><span class="live-dot"></span> A clearer view of every drop</span>
        <h2 id="story-title">Know your water.<br><em>Protect what matters.</em></h2>
        <p>Follow consumption as it happens, catch unusual flow early, and turn everyday data into peace of mind.</p>
        <div class="story-features" aria-label="AquaSense features">
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-7 4 14 2.5-7h5"/></svg> Live flow insights</span>
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.4c0 4.8 3.2 8.1 7.5 9.6 4.3-1.5 7.5-4.8 7.5-9.6V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg> Leakage awareness</span>
        </div>
      </div>
      <div class="story-art">
        <img src="assets/images/water-system-story.webp" width="2172" height="724" alt="Illustrated home water system with connected pipes, sensors, and a storage tank">
      </div>
      <p class="story-caption"><span></span> From the main inlet to every tap</p>
    </section>

    <main class="form-panel" id="auth-main">
      <div class="form-top"><span class="form-top-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.5S5.5 9.4 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.5 12 2.5Z"/></svg></span><span>YOUR WATER, IN FOCUS</span></div>
      <div class="form-card">
        <div class="form-heading">
          <p class="eyebrow"><?= $registering ? 'GET STARTED' : 'GOOD TO SEE YOU' ?></p>
          <h1><?= $title ?></h1>
          <p><?= $subtitle ?></p>
        </div>
        <div class="form-alert" id="formAlert" role="alert" hidden></div>
        <form id="authForm" novalidate>
          <?php if ($registering): ?>
          <div class="field">
            <label for="displayName">Your name</label>
            <div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.4-4 2.8-6 7-6s6.6 2 7 6"/></svg><input id="displayName" name="displayName" type="text" autocomplete="name" placeholder="Alex Morgan" maxlength="80" required></div>
            <small class="field-error" id="displayNameError" aria-live="polite"></small>
          </div>
          <?php endif; ?>
          <div class="field">
            <label for="email">Email address</label>
            <div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><input id="email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required></div>
            <small class="field-error" id="emailError" aria-live="polite"></small>
          </div>
          <div class="field">
            <div class="label-row"><label for="password">Password</label><?php if (!$registering): ?><button class="text-button" type="button" id="resetPassword">Forgot password?</button><?php endif; ?></div>
            <div class="input-wrap password-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="password" name="password" type="password" autocomplete="<?= $registering ? 'new-password' : 'current-password' ?>" placeholder="<?= $registering ? 'At least 6 characters' : 'Enter your password' ?>" minlength="6" required><button type="button" class="password-toggle" aria-label="Show password" aria-pressed="false" data-toggle-password="password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
            <?php if ($registering): ?><p class="field-hint">Use at least 6 characters.</p><?php endif; ?>
            <small class="field-error" id="passwordError" aria-live="polite"></small>
          </div>
          <?php if ($registering): ?>
          <div class="field">
            <label for="confirmPassword">Confirm password</label>
            <div class="input-wrap password-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Repeat your password" required><button type="button" class="password-toggle" aria-label="Show confirm password" aria-pressed="false" data-toggle-password="confirmPassword"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
            <small class="field-error" id="confirmPasswordError" aria-live="polite"></small>
          </div>
          <?php endif; ?>
          <button class="submit-button" id="submitButton" type="submit"><span><?= $registering ? 'Create account' : 'Sign in to dashboard' ?></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>
        </form>
        <p class="switch-page"><?= $registering ? 'Already have an account?' : 'New to AquaSense?' ?> <a href="<?= $registering ? 'login.php' : 'register.php' ?>"><?= $registering ? 'Sign in' : 'Create an account' ?></a></p>
      </div>
      <p class="form-footer">AquaSense <span>·</span> Smarter water starts here</p>
    </main>
  </div>
  <script src="assets/js/firebase-config.js"></script>
  <script type="module" src="assets/js/auth.js"></script>
</body>
</html>
