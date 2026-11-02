<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="sm">

<xsl:template match="/">
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>نقشه سایت ابزاربوک</title>
<style>
body{font-family:Tahoma,system-ui,sans-serif;background:#f4f0e6;color:#1c1914;margin:0;padding:20px;line-height:1.6}
h1{font-size:1.4rem;margin:0 0 8px}
.meta{color:#6b6350;font-size:.9rem;margin-bottom:20px}
table{width:100%;border-collapse:collapse;background:#fffdf8;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px -6px rgba(40,35,20,.12)}
th,td{padding:10px 12px;text-align:right;border-bottom:1px solid #e2d8c0}
th{background:#2a4d6e;color:#fff;font-weight:700}
tr:hover td{background:#f8f4ea}
a{color:#2a4d6e;text-decoration:none}
a:hover{text-decoration:underline}
.prio{font-weight:700}
</style>
</head>
<body>
<h1>نقشه سایت ابزاربوک</h1>
<p class="meta">تعداد صفحات: <xsl:value-of select="count(sm:urlset/sm:url)"/> — آخرین به‌روزرسانی: <xsl:value-of select="sm:urlset/sm:url[1]/sm:lastmod"/></p>
<table>
<thead>
<tr>
<th>آدرس</th>
<th>اولویت</th>
<th>تغییر</th>
<th>آخرین تغییر</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="sm:urlset/sm:url">
<tr>
<td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
<td class="prio"><xsl:value-of select="sm:priority"/></td>
<td><xsl:value-of select="sm:changefreq"/></td>
<td><xsl:value-of select="sm:lastmod"/></td>
</tr>
</xsl:for-each>
</tbody>
</table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
