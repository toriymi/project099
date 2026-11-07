# Фон личной страницы

Сейчас вкладка называется `toriymi`. После короткой загрузочной заставки появляются заголовок `THE OTHER SIDE` и карточки социальных сетей поверх фона. Нажмите на звезду рядом с `TORIYMI`, чтобы включить ночную тему; выбор сохраняется между посещениями.

Чтобы посмотреть фон, откройте `index.html` в браузере.

Для отладки откройте `http://127.0.0.1:5173/?debug=1`; в панели можно временно скрыть фоновые иконки, не затрагивая градиент.

- Палитра и градиенты обеих тем настраиваются в `styles.css`.
- В ночной теме фоновые символы берутся из `assets/night-icons-pattern.png`, а фавикон переключается на `assets/favicon-night.png`.
- Основной фавикон находится в `assets/favicon.svg`.
- Анимация отключается при системной настройке уменьшения движения.
- Cascadia Code подключён локально из `assets/` и используется для текста страницы.
- Ссылки на Telegram, Steam, Last.fm, Spotify и TikTok настроены в `index.html`; карточка Discord отображает имя `toriymi` без ссылки.
- SVG-иконки соцсетей лежат в `assets/icon-*.svg`.
- Ссылки показаны крупными горизонтальными карточками, каждая в отдельном ряду; ширина блока, размер карточек и иконок настраиваются в `styles.css`.

## Музыкальный плеер

Карточка под заголовком показывает трек, который Last.fm помечает как `nowplaying`, или последний трек из профиля `omnipotence88`. Данные обновляются раз в 30 секунд; Cloudflare кеширует ответ на 20 секунд.

Endpoint `/api/now-playing` находится в `functions/api/now-playing.js` и запускается как Cloudflare Pages Function на Workers. Last.fm API включает текущий трек с `nowplaying="true"`, когда получает этот статус от подключённого музыкального сервиса. [Документация Last.fm](https://www.last.fm/api/show/user.getRecentTracks)

Чтобы запустить локально:

1. Создайте API key на [странице Last.fm API](https://www.last.fm/api/account/create) и включите Spotify scrobbling в настройках Last.fm.
2. Создайте в корне проекта файл `.dev.vars` со строкой `LASTFM_API_KEY=ваш_ключ`.
3. Выполните `node scripts/build-pages.mjs`, затем `npx wrangler pages dev dist`.

Для деплоя на Cloudflare Pages укажите build command `node scripts/build-pages.mjs` и output directory `dist`. Добавьте `LASTFM_API_KEY` как Secret в настройках Pages или выполните `npx wrangler pages secret put LASTFM_API_KEY --project-name toriymi-site`. Ключ не добавляйте в сайт или репозиторий. [Secrets Cloudflare](https://developers.cloudflare.com/pages/functions/bindings/)
