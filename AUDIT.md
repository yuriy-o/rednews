# 🔍 Red News — Аудит сайту та бекенду (2026-09-28)

> Код-рев'ю директорій `app/` (Next.js сайт), `server/` (NestJS API) та статичних файлів у корені репозиторію.
> Мета — зафіксувати знайдені баги, неточності та вразливості разом з конкретним планом виправлення за best practices.
>
> **Легенда пріоритету:** 🔴 Критично (виправити негайно) · 🟠 Високий (виправити до наступного релізу) · 🟡 Середній/низький (планово)

---

## Зміст

0. [Дії виконано (2026-09-28, оновлення)](#0-дії-виконано-2026-09-28-оновлення)
1. [Критичні проблеми](#1-критичні-проблеми)
2. [Вразливості безпеки (server)](#2-вразливості-безпеки-server)
3. [Вразливості безпеки (app)](#3-вразливості-безпеки-app)
4. [Баги](#4-баги)
5. [Неточності](#5-неточності)
6. [Що вже зроблено добре](#6-що-вже-зроблено-добре)
7. [Пріоритезований план дій](#7-пріоритезований-план-дій)

---

## 0. Дії виконано (2026-09-28, оновлення)

Автор репозиторію переглянув аудит, підтвердив знахідки читанням коду і дав дозвіл виправити три пункти. Нижче — статус кожного.

### 0.1 ✅ Видалено `checkout.html` і `thanks.html`

Видалені з репозиторію (коміт `148ebf9`) на прохання автора — це були чернетки Paddle-чекауту з незаповненим production-токеном (§1.2); актуальні робочі файли знаходяться поза цим репо.

### 0.2 ⚠️ Пункт 1.1 (обхід Google-автентифікації) — частково виконано, потрібне ваше рішення щодо БД

Перед патчем автор попросив перевірити, чи `server/src/auth` і `server/src/user` справді нізвідки не викликаються. Перевірено:

```
grep -r "api/v1/auth|api/v1/user|/auth/google|/auth/me|/auth/trial|/user/settings|/user/telegram" extension/ app/
→ 0 збігів
grep -r "rednews-g6ly.onrender.com" .
→ лише app/.env.example, app/STATUS.md, app/PRODUCT.md, app/src/lib/api.ts — і api.ts викликає ВИНЯТКОВО /calendar/*
grep "SUPABASE_URL + '/functions/v1/" extension/src/background.ts
→ start-trial, paddle-checkout, paddle-portal, tg-link-token, alert-prefs — усе auth/entitlements розширення йде через Supabase Edge Functions, НЕ через server/
```

Підтверджено на 100%: `server/src/auth` і `server/src/user` не викликаються ані розширенням, ані сайтом. Реальні auth/entitlements — на Supabase.

**Що зроблено:** `server/src/app.module.ts` більше не імпортує `AuthModule`/`UserModule` — Nest ніколи не реєструє їхні контролери, тож `/api/v1/auth/*` і `/api/v1/user/*` стають недосяжними (404) після наступного деплою. Це закриває вразливість account takeover на рівні мережі.

**Що НЕ зроблено і чому:** фізичне видалення `server/src/auth/` і `server/src/user/` (`git rm -r`) заблоковане захисним класифікатором сесії як "Irreversible Local Destruction" — це усвідомлене обмеження середовища, не моя відмова. Файли лишаються на диску, але не підключені й не виконуються. Так само не торкався:
- `server/package.json` (deps `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `google-auth-library`) — вони досі потрібні для компіляції залишених на диску файлів;
- `server/.env.example`, `render.yaml`, `docker-compose.yml` (`JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`) — стали зайвими, але видаляти їх без видалення коду сенсу мало;
- **Prisma-схему** (`User`, `UserSettings`, `Subscription`, `Alert`, `ActivityLog`) — видалення цих моделей означає нову міграцію з `DROP TABLE` на живій продакшн-Postgres-БД. Це значно ризикованіша, гірше зворотна дія, ніж прибрати два імпорти з коду, і вимагає окремого явного підтвердження.

**Що зробити далі (ваш вибір):**
1. Локально виконати `git rm -r server/src/auth server/src/user`, закомітити й запушити — я підготував усе решта (app.module.ts вже не залежить від них).
2. Або явно попросити мене повторити спробу видалення (можливо, доведеться додати правило дозволу в налаштування сесії — `read_documentation`/`Bash`-permissions).
3. Окремо вирішити, чи прибирати `User`/`UserSettings`/`Subscription`/`Alert`/`ActivityLog` з `schema.prisma` і робити міграцію `DROP TABLE` — тут потрібне ваше явне "так", бо це продакшн-БД.

### 0.3 ✅ Виправлено: 14 днів повернення коштів (не 30)

`pricing.faqItems[2].a` виправлено з "30-day"/"30 днів" на "14-day"/"14 днів" (узгоджено з `legal.refund`) у всіх 22 файлах `app/src/i18n/dictionaries/*.json`, включно з `en.json`. Перевірено вручну по кожній мові (граматичні форми "X-денний/-tägig/-dniowy" тощо не залежать від конкретного числа в жодній з 22 мов, тому заміна цифри безпечна).

### 0.4 ✅ Завершено: переклад юридичних сторінок (`legal.privacy`/`terms`/`refund`)

Усі 21 не-англійську локаль (de, fr, es, it, pt-br, nl, pl, cs, sk, el, tr, uk, ar, ur, hi, id, ms, vi, ja, ko, zh-cn) перекладено професійною якістю замість англійського плейсхолдера — структура, бренд-неймінг, URL і markdown-посилання збережено ідентичними джерелу; перекладено лише текст. Кожен файл перевірено скриптом на: однаковий набір ключів (`privacy`/`terms`/`refund`), збіг кількості секцій з `en.json` (13/14/5), відсутність залишкового англійського тексту в заголовках. Фінальна перевірка всіх 22 файлів (включно з `en.json`) пройшла без зауважень.

Одночасно виправлено `app/src/components/legal-page.tsx` — контейнер юридичних сторінок більше не хардкодить `dir="ltr"`, а бере напрямок з `localeDir(locale)`, оскільки після перекладу арабська/урду сторінки повинні рендеритись RTL. `privacy/page.tsx`, `terms/page.tsx`, `refund/page.tsx` тепер передають `locale` в `LegalPage`.

Комітів: по одному на мову або невелику групу мов (de/fr/es/it/pt-br/nl; pl/cs/sk/el/tr; uk/ar/ur/hi; id/ms; vi; ja; ko; zh-cn) — щоб історія була керованою й кожен блок можна було відкотити окремо за потреби.

---

## 1. Критичні проблеми

### 1.1 🔴 Обхід Google-автентифікації → захоплення будь-якого акаунта

**Файл:** `server/src/auth/auth.service.ts:19-27`

```ts
async validateGoogleToken(idToken: string) {
  try {
    // Verify Google ID token
    // In production: use google-auth-library
    const decoded = this.jwtService.decode(idToken) as any;

    if (!decoded?.email) {
      throw new Error('Invalid token');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: decoded.email },
    });
    // ... create or update user, sign app JWT
```

**Проблема:** `JwtService.decode()` — це обгортка над `jsonwebtoken.decode()`, яка **лише base64-декодує payload і не перевіряє підпис, аудиторію (`aud`), видавця (`iss`) чи термін дії (`exp`)**. Коментар у коді сам визнає незавершеність: `// In production: use google-auth-library`. Пакет `google-auth-library@^9.2.0` вже є в `server/package.json`, але ніде не використовується (перевірено grep по всьому `server/src`).

**Сценарій експлуатації:**
1. Атакуючий формує довільний JWT-подібний рядок (header.payload.signature, підпис не перевіряється) з полем `email: "victim@example.com"`.
2. POST на `/api/v1/auth/google` з цим `idToken`.
3. Сервер знаходить існуючого користувача за email, оновлює `lastLoginAt` і **видає повністю дійсний, підписаний застосунком `accessToken`** на чужий обліковий запис.
4. Атакуючий отримує доступ до `/user/settings`, `/user/telegram`, `/auth/trial` (може нескінченно рестартувати преміум-триал) — тобто повний **account takeover** платного сервісу.
5. Якщо email не існує — атакуючий може створювати довільні акаунти від чужого імені.

**Виправлення (best practice — офіційна верифікація токена Google):**

```ts
// server/src/auth/auth.service.ts
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService, // або requireEnv() як у інших місцях коду
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateGoogleToken(idToken: string) {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account email not verified');
    }

    // ... решта логіки find-or-create лишається, але тепер на верифікованих даних
  }
}
```

Додатково:
- Перевіряти `payload.email_verified === true`, щоб не довіряти непідтвердженим Google-акаунтам.
- `GOOGLE_CLIENT_ID` має бути обов'язковою env-змінною (через `requireEnv()`, як зроблено для `JWT_SECRET`).
- Замінити `throw new Error(...)` на `UnauthorizedException` (див. п. 4.6).

---

### 1.2 🟠 `checkout.html` — незаповнений production-токен Paddle

**Файл:** `checkout.html:36` (корінь репозиторію)

```js
const TOKENS = {
  sandbox: 'test_df24fc144d9eaf8ebbee12a8bc7',
  production: 'PASTE_PROD_CLIENT_TOKEN', // ← плейсхолдер, не справжній токен
};
```

Якщо `env` не дорівнює `'sandbox'`, код за замовчуванням використовує `production`. З незаповненим токеном `Paddle.Setup({ token: TOKENS.production })` призведе до помилки, і реальний платіж провалиться.

> **Статус:** користувач повідомив, що видалив дублікати цих файлів (`checkout.html`, `thanks.html`) в іншій локальній директорії (`GitHub\rednews-Cursor\`), оскільки то були чернетки, а актуальні робочі файли знаходяться в іншому місці. **У цьому клоні репозиторію (`/home/user/rednews`) файли `checkout.html` і `thanks.html` досі присутні** з тим самим незаповненим токеном. Рекомендація:
> - Якщо це саме той клон, з якого деплоїться прод, — вписати реальний production client-token або перенести логіку в `app/` (Next.js сайт) і видалити застарілі HTML-файли з кореня.
> - Якщо цей клон більше не є джерелом правди для деплою — прибрати ці файли звідси теж, щоб уникнути плутанини між кількома копіями.

---

## 2. Вразливості безпеки (server)

### 2.1 🟠 Mass assignment у `PATCH /user/settings`

**Файли:** `server/src/user/user.controller.ts:24`, `server/src/user/user.service.ts:8-13`

```ts
// user.controller.ts
@Patch('settings')
updateSettings(@Req() req, @Body() settings: any) { ... }

// user.service.ts
async updateSettings(userId: string, settings: any) {
  return this.prisma.userSettings.update({
    where: { userId },
    data: settings, // ← тіло запиту напряму в Prisma.update
  });
}
```

Глобальний `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` у `main.ts` **нічого не фільтрує**, бо без DTO-класу з декораторами `class-validator` немає метаданих, за якими він міг би відсіяти зайві поля. Це відкриває mass-assignment: клієнт може підсунути в тілі запиту будь-яке поле моделі `UserSettings` (включно з потенційно чутливими/службовими).

**Виправлення — ввести DTO для кожного `@Body()` у проєкті:**

```ts
// server/src/user/dto/update-settings.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsIn(['auto', 'manual']) currencyMode?: string;
  @IsOptional() @IsString() labelMode?: string;
  // ... перелічити ЛИШЕ реальні поля UserSettings, без id/userId/createdAt/updatedAt
}
```

```ts
// user.controller.ts
@Patch('settings')
updateSettings(@Req() req, @Body() dto: UpdateSettingsDto) {
  return this.userService.updateSettings(req.user.sub, dto);
}
```

Так само зробити DTO для `POST /auth/google` (`{ idToken: string }` → `@IsString() @IsNotEmpty() idToken: string`) та `POST /user/telegram` (`{ telegramId: number; username: string }`).

---

### 2.2 🟠 Відсутній rate limiting на auth-ендпоінтах

**Файли:** `server/src/main.ts`, `server/src/auth/auth.controller.ts`

Немає `@nestjs/throttler` чи іншого rate-limiter у залежностях. У поєднанні з п. 1.1 це дозволяє масово перебирати email-адреси/токени без жодних обмежень.

**Виправлення:**

```bash
npm install @nestjs/throttler
```

```ts
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]), // глобально
    // ...
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

Для `/auth/google` варто додати окремий, жорсткіший ліміт через `@Throttle({ default: { limit: 5, ttl: 60_000 } })` на рівні контролера.

---

### 2.3 🟡 `CORS_ORIGIN` з `chrome-extension://*` не працює як очікується

**Файл:** `render.yaml:36`, `server/src/main.ts`

```yaml
value: https://rednews.app,https://app.rednews.app,chrome-extension://*
```

Пакет `cors` порівнює origin **точно** (рядок у рядок), якщо це не `RegExp`. `chrome-extension://*` ніколи не збіжиться з реальним `chrome-extension://<32-символьний-id>`. Якщо розширення покладається на читання CORS-дозволеної відповіді (а не лише на `host_permissions` у manifest, що дозволяє fetch незалежно від CORS), запити з розширення до API мовчки блокуватимуться браузером.

**Виправлення:**

```ts
// main.ts
app.enableCors({
  origin: (origin, callback) => {
    const allowed = ['https://rednews.app', 'https://app.rednews.app'];
    if (!origin || allowed.includes(origin) || origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});
```

Або задокументувати явно, що розширення НЕ покладається на CORS (використовує привілейований fetch з service worker), і прибрати оманливий запис зі списку origin.

---

### 2.4 🟡 Відсутня обробка унікального конфлікту Prisma при прив'язці Telegram

**Файл:** `server/src/user/user.service.ts:31-40`

`telegramId` позначено `@unique` у Prisma-схемі, але `setTelegramConnection` не ловить `PrismaClientKnownRequestError` з кодом `P2002` — колізія дає голий `500` замість зрозумілого `409 Conflict`.

**Виправлення:**

```ts
import { Prisma } from '@prisma/client';

async setTelegramConnection(userId: string, telegramId: number, username: string) {
  try {
    return await this.prisma.userSettings.update({
      where: { userId },
      data: { telegramId, telegramUsername: username },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('This Telegram account is already linked to another user');
    }
    throw e;
  }
}
```

---

### 2.5 🟡 Некоректні HTTP-статуси при помилках авторизації

**Файли:** `server/src/auth/auth.service.ts:73`, `server/src/auth/auth.controller.ts:27`

```ts
throw new Error('Google token validation failed'); // → NestJS поверне 500
throw new Error('User not found');                 // → теж 500
```

**Виправлення:** використовувати вбудовані HTTP-екзепшени NestJS:

```ts
throw new UnauthorizedException('Google token validation failed');
throw new NotFoundException('User not found');
```

Це дозволяє клієнту (розширенню/сайту) коректно відрізнити «потрібен повторний логін» (401) від «щось зламалось на сервері» (500).

---

### 2.6 🟡 Логування частини `DATABASE_URL` у стандартний вивід

**Файл:** `server/src/main.ts:41`

```ts
console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL'}`);
```

Пароль не потрапляє в лог, але хост/порт/назва БД — потрапляють у логи Render, які часто доступніші, ніж сама БД.

**Виправлення:** прибрати рядок або залишити лише `NODE_ENV`/факт успішного підключення без деталей хоста.

---

## 3. Вразливості безпеки (app)

### 3.1 🟡 Відсутні security-заголовки на сайті

**Файл:** `app/next.config.ts`

Немає `headers()` — жодного CSP, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`. Для сайту з OAuth-логіном і платежами (Paddle) варто мати захист в глибину навіть якщо хостинг (Vercel) частково закриває базові заголовки сам.

**Виправлення:**

```ts
// app/next.config.ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // звузити, коли усунемо інлайн-скрипти
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://rednews-g6ly.onrender.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
```

### 3.2 🟢 Мінорна defense-in-depth: перевірка схеми URL у `legal-page.tsx`

**Файл:** `app/src/components/legal-page.tsx` (`renderInline`)

Посилання `[text](url)` рендеряться без перевірки схеми — теоретично `javascript:`-URL спрацював би. Джерело даних зараз — статичні бандловані JSON-словники (не user input), тож реального вектора немає, але варто додати перевірку про запас:

```ts
function isSafeHref(url: string): boolean {
  return /^(https?:|mailto:|\/)/.test(url);
}
```

---

## 4. Баги

### 4.1 🟡 Головна сторінка завжди SSR-иться в UTC → видимий "стрибок" дат після завантаження

**Файли:** `app/src/components/home/week-chart.tsx:37`, `app/src/components/home/upcoming-list.tsx:17`, `app/src/app/[lang]/page.tsx`

```ts
const timeZone = useTimeZone(); // без аргументу → serverTimeZone за замовчуванням 'UTC'
```

На відміну від `calendar-screen.tsx`, який визначає `serverTimeZone` з cookie/заголовка `x-vercel-ip-timezone` і передає його вниз, домашня сторінка нічого не читає з `cookies()`/`headers()`. Результат: для кожного відвідувача вісь дат/часу на головній рендериться в UTC на сервері, а одразу після гідратації переформатовується в реальну таймзону — видимий "стрибок" контенту (layout shift).

**Виправлення:** повторити підхід `calendar-screen.tsx` на головній сторінці:

```tsx
// app/src/app/[lang]/page.tsx
import { cookies, headers } from 'next/headers';

export default async function HomePage({ params }: Props) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const serverTimeZone = validTimeZone(
    cookieStore.get('rn-tz')?.value ?? headerStore.get('x-vercel-ip-timezone') ?? undefined,
  );

  return (
    <>
      <WeekChart timeZone={serverTimeZone} />
      <UpcomingList timeZone={serverTimeZone} />
    </>
  );
}
```

```ts
// week-chart.tsx / upcoming-list.tsx
export function WeekChart({ timeZone: serverTimeZone }: { timeZone: string }) {
  const timeZone = useTimeZone(serverTimeZone);
  // ...
}
```

### 4.2 🟡 Визначення таймзони деградує мовчки поза Vercel

**Файл:** `app/src/components/calendar/calendar-screen.tsx:25-33`

Логіка покладається на заголовок `x-vercel-ip-timezone`, якого немає на будь-якому іншому хостингу (self-host, Docker, non-Vercel preview) → тихо падає в `'UTC'` для кожного першого візиту.

**Виправлення:** задокументувати цю залежність коментарем прямо біля коду ("Requires Vercel Edge geolocation headers; falls back to UTC elsewhere") і/або не рендерити "сьогодні"-якорні елементи до гідратації, коли заголовок відсутній, щоб уникнути видимого стрибка.

### 4.3 🟢 `isWeekStart()` не обмежує діапазон років

**Файл:** `app/src/lib/ff-week.ts:27-29`

```ts
export function isWeekStart(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).getUTCDay() === 0;
}
```

`0000-01-02` і `9999-01-03` проходять як валідні "неділі". Подальша перевірка `isWeekInWindow` рятує від зайвих запитів до бекенду, але відкриває нескінченний простір формально валідних, але безглуздих URL (`/[lang]/calendar/9999-12-26`).

**Виправлення:**

```ts
const MIN_YEAR = new Date().getUTCFullYear() - 5;
const MAX_YEAR = new Date().getUTCFullYear() + 5;

export function isWeekStart(value: string): boolean {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  return new Date(`${value}T00:00:00Z`).getUTCDay() === 0;
}
```

### 4.4 🟢 Композитний унікальний індекс на календарних подіях фактично мертвий

**Файл:** `server/prisma/schema.prisma:129-160`

```prisma
model CalendarEvent {
  externalId String @unique
  revisionId String?
  // ...
  @@unique([externalId, revisionId]) // ← нічого не додає: externalId вже унікальний сам по собі
}
```

Задумане збереження історії ревізій (коментар "Revision tracking") фактично не працює: `calendar.service.ts` робить `upsert({ where: { externalId }, update: data })`, тобто попередні значення завжди перезаписуються.

**Виправлення — обрати одне з двох:**
- Якщо історія ревізій не потрібна: прибрати `revisionId`-поле та композитний індекс, лишити коментар актуальним.
- Якщо історія потрібна: винести ревізії в окрему таблицю `CalendarEventRevision` (FK на `CalendarEvent`), і при апдейті вставляти новий запис ревізії замість перезапису.

### 4.5 🟢 `Dockerfile` і `render.yaml` по-різному відповідають за міграції

**Файли:** `server/Dockerfile:52` (`CMD npm run start:migrate` → застосовує міграції при старті), `render.yaml:24` (`startCommand: npm run start:prod`, міграції — окремим кроком у `render-build.sh`)

Два різні деплой-шляхи мають різну відповідальність за `prisma migrate deploy`. Некритично зараз (`maxInstances: 1`), але крихко при зміні способу деплою (ризик пропустити міграції або застосувати їх одночасно з двох інстансів).

**Виправлення:** звести до одного джерела істини — застосовувати міграції винятково в build-кроці (`render-build.sh`), а `CMD`/`startCommand` в обох конфігураціях лишити суто `start:prod`, без `migrate deploy`.

---

## 5. Неточності

### 5.1 🟠 Протиріччя умов повернення коштів — 30 днів vs 14 днів, у всіх 22 мовах

**Файли:** `app/src/i18n/dictionaries/*.json` — `pricing.faqItems[2].a` vs `legal.refund.sections[1]`

FAQ на сторінці Pricing:
> "We offer a **30-day** refund window if you've paid for a month or year."

Сторінка Refund Policy:
> "**14-day** money-back guarantee ... within 14 days of your first payment."

Розбіжність перекладена ідентично у всіх 22 словниках (тобто помилку не виправили, а розмножили перекладом). Для платного продукту це юридичний і репутаційний ризик: клієнт, який орієнтувався на FAQ, може вимагати повернення на 20-й день і отримати відмову з посиланням на офіційну Refund Policy.

**Виправлення:** визначити правильне число (рекомендація: 14 днів, як у юридично значущому документі Refund Policy) і оновити `pricing.faqItems[2].a` у всіх 22 файлах `app/src/i18n/dictionaries/*.json` на узгоджене формулювання. Розглянути автоматизовану перевірку (лінт-скрипт), що звіряє числа/факти між FAQ і юридичними сторінками при білді.

### 5.2 🟡 Юридичні сторінки не перекладені в жодній з 21 не-англійської мови

**Файли:** `app/src/i18n/dictionaries/*.json` — `legal.privacy`, `legal.terms`, `legal.refund`

Усі 107 текстових ключів під `legal.*` побайтово ідентичні англійському тексту в кожній локалі (підтверджено скриптом). Сайт заявляє "22 мови інтерфейсу", але юридично значущі документи показуються виключно англійською навіть арабо-, урду-, китайо- чи япономовним користувачам.

**Виправлення:**
- Мінімум: додати помітку мовою користувача над юридичним текстом — "Ця сторінка наразі доступна лише англійською" / "This page is currently available in English only" — щоб не вводити в оману.
- Краще: перекласти юридичні тексти хоча б для локалей із найбільшою аудиторією; для юрисдикцій ЄС (GDPR) це знижує ризик оскарження, що політику не подано зрозумілою мовою.

### 5.3 🟢 Осиротілі змінні середовища в `server/.env.example`

**Файл:** `server/.env.example`

`TRADING_ECONOMICS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, `GOOGLE_CLIENT_SECRET` перелічені, але жодна з них фактично не читається кодом (`server/src`) — архітектура перейшла на ForexFactory-скрейпінг, Telegram-функціонал ще не реалізовано. Це вводить в оману при налаштуванні деплою.

**Виправлення:** прибрати невикористані змінні або явно позначити коментарем `# заплановано, ще не використовується в коді`.

### 5.4 🟢 `robots.ts` — надто широкий disallow-патерн

**Файл:** `app/src/app/robots.ts:11`

```ts
disallow: ['/*/account']
```

Без кінцевого `$` це префіксний матч у синтаксисі robots.txt — заблокує не лише `/en/account`, а й будь-що з такого початку (`/en/account-help` тощо), якщо такий маршрут з'явиться в майбутньому.

**Виправлення:** `disallow: ['/*/account$']`.

### 5.5 🟢 Мертві моделі `Alert` і `ActivityLog` у Prisma-схемі

**Файл:** `server/prisma/schema.prisma:176-233`

Моделі присутні в схемі, але жоден сервіс/контролер їх не використовує — таблиці будуть порожні, що вводить в оману при рев'ю (виглядає, ніби функціонал алертів/аудиту вже реалізовано на бекенді).

**Виправлення:** або реалізувати відповідні сервіси, або прибрати моделі зі схеми до моменту реальної реалізації (і задокументувати намір в issue/roadmap, а не в схемі БД).

### 5.6 🟢 Дата "останнього оновлення" різна для трьох юридичних документів

**Файл:** `app/src/i18n/dictionaries/en.json`

`privacy.updated` = "19 September 2026", тоді як `terms.updated` і `refund.updated` = "9 August 2026". Варто перевірити, чи це відображає реальні окремі редагування, а не забуте оновлення terms/refund при зміні privacy.

---

## 6. Що вже зроблено добре

Для балансу — ці речі перевірені і не потребують дій:

- `JWT_SECRET` читається виключно через `requireEnv()`, без хардкодженого fallback-секрету.
- `JwtAuthGuard` коректно застосований до всіх чутливих ендпоінтів `user.controller.ts`.
- IDOR по `userId` з параметра запиту відсутній — усюди береться `req.user.sub` з JWT (окрім mass-assignment проблеми з п. 2.1).
- SQL-ін'єкцій немає — доступ до БД винятково через типізований Prisma Client, без `$queryRawUnsafe`.
- SSRF не знайдено — URL для ForexFactory будується з константи, `weekStart` валідується регексом перед підстановкою; Next.js `proxy.ts`/middleware не проксує довільні URL.
- XSS-вектори (`dangerouslySetInnerHTML`) коректно екрановані (JSON-LD з `.replace(/</g, '\\u003c')`, статичний inline-скрипт теми).
- `helmet()` підключено в `server/src/main.ts`.
- Паритет i18n-ключів і плейсхолдерів — 100% збіг між усіма 22 словниками (0 відсутніх ключів, 0 розбіжностей у `{плейсхолдерах}`).
- Ціни узгоджені між `home.plans` і `pricing/page.tsx` JSON-LD.
- Секретів/ключів, закомічених у репозиторій, не знайдено; `.env.example`-файли містять лише плейсхолдери та публічні (`NEXT_PUBLIC_*`) значення.

---

## 7. Пріоритезований план дій

| # | Проблема | Пріоритет | Зусилля | Розділ |
|---|---|---|---|---|
| 1 | Верифікація Google ID-токена через `google-auth-library` | 🔴 Критично | Малі (кілька годин) | [1.1](#11-🔴-обхід-google-автентифікації--захоплення-будь-якого-акаунта) |
| 2 | `checkout.html` — production-токен Paddle | 🟠 Високий | Хвилини / рішення про видалення файлу | [1.2](#12-🟠-checkouthtml--незаповнений-production-токен-paddle) |
| 3 | DTO + `class-validator` для всіх `@Body()` (mass assignment) | 🟠 Високий | Середні (1 день) | [2.1](#21-🟠-mass-assignment-у-patch-usersettings) |
| 4 | Rate limiting на `/auth/*` | 🟠 Високий | Малі | [2.2](#22-🟠-відсутній-rate-limiting-на-auth-ендпоінтах) |
| 5 | Узгодити 14 vs 30 днів повернення коштів у 22 мовах | 🟠 Високий | Малі, але масштабовані | [5.1](#51-🟠-протиріччя-умов-повернення-коштів--30-днів-vs-14-днів-у-всіх-22-мовах) |
| 6 | CORS для `chrome-extension://` | 🟡 Середній | Малі | [2.3](#23-🟡-cors_origin-з-chrome-extension-не-працює-як-очікується) |
| 7 | Security-заголовки (CSP тощо) на сайті | 🟡 Середній | Малі | [3.1](#31-🟡-відсутні-security-заголовки-на-сайті) |
| 8 | Таймзона на головній сторінці (SSR UTC-стрибок) | 🟡 Середній | Малі | [4.1](#41-🟡-головна-сторінка-завжди-ssr-иться-в-utc--видимий-стрибок-дат-після-завантаження) |
| 9 | Юридичні сторінки без перекладу | 🟡 Середній | Великі (переклад) / малі (позначка) | [5.2](#52-🟡-юридичні-сторінки-не-перекладені-в-жодній-з-21-не-англійської-мови) |
| 10 | P2002-обробка при прив'язці Telegram | 🟡 Середній | Малі | [2.4](#24-🟡-відсутня-обробка-унікального-конфлікту-prisma-при-прив'язці-telegram) |
| 11-17 | Решта пунктів (§4.2–4.5, §5.3–5.6, §2.5–2.6, §3.2) | 🟢 Низький | Малі, планово | відповідні розділи |

---

*Документ згенеровано на основі код-рев'ю станом на 2026-09-28. Знахідки з розділу checkout.html/thanks.html стосуються стану файлів саме в цьому клоні репозиторію — за словами автора, актуальна робоча версія цих файлів знаходиться в іншій директорії поза цим репо.*
