import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('conditional OAuth auth UI', () => {
  it('renders no provider section or divider when no provider is configured', () => {
    const buttons = read('src/components/auth/SsoButtons.tsx');
    assert.match(buttons, /getAuthProviders/);
    assert.match(buttons, /providers\.length\s*===\s*0/);
    assert.match(buttons, /return null/);
    assert.match(buttons, /AuthDivider/);
    assert.doesNotMatch(buttons, /Pr[oó]ximamente|disabled\s*\n/);
  });

  it('renders each provider independently and starts OAuth through the same-origin auth API', () => {
    const buttons = read('src/components/auth/SsoButtons.tsx');
    const authApi = read('src/services/authApi.ts');
    const login = read('src/components/auth/LoginForm.tsx');
    const signup = read('src/components/auth/SignupForm.tsx');

    assert.match(buttons, /google/);
    assert.match(buttons, /github/);
    assert.match(buttons, /startOAuth/);
    assert.match(buttons, /setError\(t\('auth\.oauth\.start_error'\)\)/);
    assert.doesNotMatch(buttons, /getAuthApiErrorMessage\(response\.status, data/);
    assert.match(authApi, /\/api\/auth\/oauth\/start/);
    assert.match(authApi, /credentials:\s*'same-origin'/);
    assert.match(login, /remember=\{remember\}/);
    assert.match(signup, /termsAccepted=\{terms\}/);
    assert.match(signup, /setTerms/);
    assert.doesNotMatch(login, /<AuthDivider/);
    assert.doesNotMatch(signup, /<AuthDivider/);
  });

  it('provides consent and OAuth status text in both locales', () => {
    const english = read('src/i18n/locales/en.ts');
    const spanish = read('src/i18n/locales/es.ts');

    for (const locale of [english, spanish]) {
      assert.match(locale, /auth\.oauth\.continue_google/);
      assert.match(locale, /auth\.oauth\.continue_github/);
      assert.match(locale, /auth\.oauth\.terms_consent/);
      assert.match(locale, /auth\.oauth\.start_error/);
      assert.match(locale, /auth\.oauth\.or_email/);
    }
  });
});
