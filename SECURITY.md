# Seguridad

## Reportar

Mandá un mail a briandlhz@proton.me con "brasas" en el asunto. No abras un issue público para algo explotable.

Contesto en unos días. Esto lo mantengo yo solo, no esperes SLA de empresa.

## Qué cuenta

- Que el plaintext o la clave lleguen al server. El browser cifra con AES-GCM y la clave vive solo en el fragmento de la URL; si algo la manda al API, es grave.
- Que un secreto se pueda leer dos veces. La lectura es `GETDEL`: la primera respuesta exitosa lo borra.
- Leer un secreto ajeno sin tener el link completo.
- XSS que permita sacar la clave del fragmento.

## Qué no

Esto está documentado en el README y es parte del diseño:

- **El host del JS es parte de la confianza.** Si no controlás el deploy, no asumas zero-knowledge: quien sirve el JS puede servir uno que exfiltre la clave. Self-hosteá código que hayas leído.
- **Sin HTTPS no hay nada que discutir.** El demo corre sobre TLS; tu deploy también tiene que hacerlo.
- **Metadata.** El server no ve el texto, pero sí el tamaño aproximado (el plaintext se padea a buckets), el TTL y la IP que ve el proxy.
- **No hay rate limit.** Cualquiera puede llenar el store. Si lo exponés, poné un límite adelante.

## Versiones

Se arregla sobre `main`. No hay backports.
