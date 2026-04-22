# Mercado Livre seller promotions (invitations)

## Base path and auth

- **Base path**: `/api/mercado-livre/seller-promotions`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Method

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/mercado-livre/seller-promotions` | List promotion invitations for the configured seller (all types: DEAL, MARKETPLACE_CAMPAIGN, VOLUME, etc.) |

## Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `promotion_type` | No | When set, filters `results` to rows where `type` matches (e.g. `DEAL`). |

## Upstream

- Calls `GET https://api.mercadolibre.com/seller-promotions/users/{SELLER_ID}?app_version=v2`
- Uses `ML_TOKEN_SECRET` as the bearer access token

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ML_TOKEN_SECRET` | Yes | Mercado Livre access token |
| `SELLER_ID` | Yes | Seller user id whose invitations are listed |

Reference: [Manage promotions](https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion) (Mercado Libre Developers).
