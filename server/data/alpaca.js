import Alpaca from '@alpacahq/alpaca-trade-api';

let _client = null;

export function getAlpacaClient() {
  if (!_client) {
    _client = new Alpaca({
      keyId:     process.env.ALPACA_KEY_ID,
      secretKey: process.env.ALPACA_SECRET_KEY,
      paper:     process.env.ALPACA_PAPER !== 'false', // default to paper trading
    });
  }
  return _client;
}
