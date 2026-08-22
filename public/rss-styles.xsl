<?xml version="1.0" encoding="utf-8"?>
<!--
  Browsers dropped native RSS rendering, so a raw feed URL shows a wall of XML.
  This stylesheet is applied client-side and turns it into a readable page,
  while feed readers ignore it entirely.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title><xsl:value-of select="/rss/channel/title" /> — RSS feed</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <style>
          :root {
            color-scheme: light dark;
            --bg: #fdfdfe; --fg: #24262e; --muted: #6b7280;
            --border: #e4e6eb; --accent: #3b5bdb; --surface: #f7f8fa;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #16181d; --fg: #eff1f5; --muted: #9aa1ad;
              --border: #2c2f38; --accent: #8ba6ff; --surface: #1d2027;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; background: var(--bg); color: var(--fg); line-height: 1.65;
            font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
          }
          .wrap { max-width: 46rem; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
          .note {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 12px; padding: 1rem 1.25rem; font-size: 0.9rem; color: var(--muted);
          }
          h1 { font-size: 2rem; letter-spacing: -0.02em; margin: 2rem 0 0.5rem; }
          .sub { color: var(--muted); margin: 0 0 2.5rem; }
          a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 3px; }
          ul { list-style: none; margin: 0; padding: 0; }
          li { border-top: 1px solid var(--border); padding: 1.5rem 0; }
          h2 { font-size: 1.15rem; margin: 0 0 0.35rem; }
          h2 a { text-decoration: none; }
          h2 a:hover { text-decoration: underline; }
          time { font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }
          p.desc { margin: 0.5rem 0 0; color: var(--muted); font-size: 0.95rem; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="note">
            This is an RSS feed. Paste this page's URL into a feed reader to get new
            posts automatically. <a href="/">Back to the site &#8594;</a>
          </p>

          <h1><xsl:value-of select="/rss/channel/title" /></h1>
          <p class="sub"><xsl:value-of select="/rss/channel/description" /></p>

          <ul>
            <xsl:for-each select="/rss/channel/item">
              <li>
                <h2>
                  <a>
                    <xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute>
                    <xsl:value-of select="title" />
                  </a>
                </h2>
                <time><xsl:value-of select="pubDate" /></time>
                <p class="desc"><xsl:value-of select="description" /></p>
              </li>
            </xsl:for-each>
          </ul>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
