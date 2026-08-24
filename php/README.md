# PHP — como rodar

O container sobe com `php:8.3-cli` e monta esta pasta (`./php`) em `/var/www/html` dentro do container. Ele fica ocioso (`sleep infinity`) porque cada etapa do estudo vive numa subpasta numerada — você escolhe qual servir.

## Subir o container

```bash
docker compose up -d
```

## Servir uma etapa

```bash
docker compose exec php php -S 0.0.0.0:3000 -t 01-servidor
```

Troque `01-servidor` pela pasta da etapa atual. Depois é só acessar `http://localhost:3000`.

## Parar

```bash
docker compose down
```
