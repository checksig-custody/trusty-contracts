# ETH Custody flow

## Funds flow

- Unlock and Withdraw: Funds -> Frozen -> Cold -> Customer
- Frozen Recovery: Funds -> Frozen -> Recovery -> (New) Frozen
- Cold Recovery: Funds -> Cold -> Recovery -> Frozen

## Smart contracts types

There are 3 smart contracts on Ethereum Mainnet involved in the flow that simulate a multi-sig protocol:

- The Frozen contract is the main custody where funds as Ether and ERC20 tokens are stored.

- The Cold contract is a middle layer contract where funds are stored for a period of X blocks (X days) before a withdraw to a customer address will be made.

- The Recovery contract is a contract (or an address is also possible) where funds can be stored and then transfered after a Recover scenario with required conditions are satisfied.

Some specific may differ from a smart contract type to another one, but mainly they share some common feature such as a transaction proposal, confirmation, revocation and execution.

## Transaction proposal

A transaction proposal consists of different parameters based on the type of transaction that will be made:

- Native Ether type where the TO field will require the address of the receiver, the VALUE field that will be the amount of ETH to transfer and an optional DATA field that can be a text/string message to be attached.

- ETH case:
  - TO field -> the address of the Cold contract
  - VALUE field -> ETH amount to be transfered
  - DATA (optional) -> a string to be attached
  - Relative Timelock (Frozen and Cold) -> 0 or more to block execution after a specified amount of blocks/time

- Contract interaction type (mainly used for ERC20 token) where the TO field corresponds of the Contract address used to interact to, the VALUE field that corresponds on the amount of ETH to be transfered to the above contract (must be 0 or funds will be lost) and the most important field in this transaction type, the DATA field which corresponds to the actual calldata encoded in hexadecimal string that contains the actual method and arguments included in the contract to be called/interacted with.

- ERC20 Token case:
  - TO field -> the token contract address to betransfered
  - VALUE field -> 0
  - DATA: the encoded calldata that contains the receiver address (Cold contract address) and the token amount to be unlocked and transfered [ex. transfer(address receiver, uint256 amount)]
  - Relative Timelock (Frozen and Cold) -> 0 or more to block execution after a specified amount of blocks/time

## Roles

In the Frozen contracts the owners are the ones with the possibility to interact with such contract and they differ in 2 roles: the authorizer which can only propose and execute a transaction proposal, and an implicit one (the Federation agent) that can only confirm and revoke a transaction proposal.

In the Cold and Recovery contract the owners corresponds to the roles that can submit a transaction proposal, confirm, revoke and execute if required conditions are met.

## Frozen transaction requirements

When funds are available in the Frozen contract an authorizer can submit a transaction proposal that will be later authorized by the authorizers and then confirimed by the Federation agents and so funds will be then transfered to the Cold contract address.
A confirmations can be revoked by each Federation agent if necessary.

To execute each type of transaction proposal in the Frozen case the requirements needed are:

- 2+ authorizations (from authorizer role) plus 3+ confirmations (from Federation agent role)
- Relative Timelock is less than current block height at execution time

## Cold transaction requirements

When funds are available in the Cold contract an owner (named Custodian) can submit a transaction proposal that can be confirmed and executed by each owner and funds will be then transfered to the Customer address.
A confirmations can be revoked by each owner if necessary.

To execute each type of transaction proposal in the Cold case the requirements needed are:

- 2+ confirmations (from owners)
- Absolute Timelock is smaller than current block height at execution time
- Relative + Absolute Timelocks is less than current block height at execution time

## Recovery

The Recovery is type of contract or address (if necessary) that can only be set at deploy time when Frozen or Cold contract code is released on the blockchain and can not be modified later on.
If the Recovery address corresponds to a multi-sig contract type than the recover transaction will be a transaction proposal with specific calldata that when executed will trigger the methods recover() or recoverERC20(address tokenToRecover) on the Frozen or the Cold contract respectively.

The Recovery scenario sligthly differs from Frozen to Cold case:

- In Frozen case a Recovery can be made only if Absolute Timelock on Frozen is less than current block height at execution time [ex. if the contract is deployed with an Absolute Timelock of 216000 than, giving the case on Mainnet that each block will be validated each 12 seconds, aproximately 30 days will be needed to execute a Recover if no transaction proposal is executed in that timeframe, thus acting as a "dead man switch lock"]

- In Cold case a Recovery can be made always regardless or Relative or Absolute Timelock on Cold (named Blocklock) giving the possibility to recover funds if necessary before each transaction proposal's execution. [ex. if the Absolute Timelock is 36000, the owner can only execute a transaction proposal after aproximately 5 days, instead the Recovery has that timeframe to prevent, if necessary, the transfer of funds before or after]
