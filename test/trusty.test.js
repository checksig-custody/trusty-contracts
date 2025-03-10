const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
//const { ethers } = require("ethers")
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { decodeCalldata } = require('../utils/calldata.js')

const accounts = {
    owner: "",
    otherOwner: "",
    otherOwner1: "",
    otherOwner2: "",
    otherAccount: "",
    randomAccount: "",
    other: "",
    anonymous: "",
    erc20contract: "",
    recovery: "",
    auth1: "",
    auth2: "",
    auth3: "",
    fede1: "",
    fede2: "",
    fede3: "",
    fede4: "",
    fede5: "",
    fede6: "",
}

let Erc20 = null;
let Recovery = null;

let Cold = null;
let Frozen = null;

const BLOCKLOCK = 28800;
const TIME_LOCK = 7200

describe("Trusty multisig tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const addresses = await hre.ethers.getSigners();  
        // for (const account of addresses) {
        //     console.log(account.address);
        // }
        accounts.owner = addresses[0]
        accounts.otherAccount = addresses[1]
        accounts.otherOwner = addresses[2]
        accounts.otherOwner1 = addresses[3]
        accounts.otherOwner2 = addresses[4]
        accounts.randomAccount = addresses[5]
        accounts.other = addresses[6]
        accounts.anonymous = addresses[7]
        accounts.erc20contract = addresses[8]
        accounts.auth1 = addresses[9]
        accounts.auth2 = addresses[10]
        accounts.auth3 = addresses[11]
        accounts.fede1 = addresses[12]
        accounts.fede2 = addresses[13]
        accounts.fede3 = addresses[14]
        accounts.fede4 = addresses[15]
        accounts.fede5 = addresses[16]
        accounts.fede6 = addresses[17]
        accounts.recovery = addresses[18]
    }

    // ERC20
    const deployErc20 = async () => {
        const Erc20Contract = await ethers.getContractFactory("ERC20");
        const erc20 = await Erc20Contract.deploy();
        Erc20 = erc20
    }
    
    // Recovery
    const deployRecovery = async (owners, threshold = 2,id="") => {
        const MusigRecovery = await ethers.getContractFactory("Recovery");
        const musigRecovery = await MusigRecovery.deploy(owners, threshold, id, { value: 0 });
        Recovery = musigRecovery
    }    

    // Cold
    const deployTrustyCold = async (owners, threshold = 2,id="",recovery) => {
        const MusigCold = await ethers.getContractFactory("TrustyCold");
        const musig = await MusigCold.deploy(owners, threshold, id, recovery, BLOCKLOCK, { value: 0 });
        Cold = musig
    }

    // Frozen
    const deployTrustyFrozen = async (owners, threshold = 2,id="", recovery, authorizers) => {
        const MusigFrozen = await ethers.getContractFactory("TrustyFrozen");
        const musig = await MusigFrozen.deploy(owners, threshold, id, recovery, BLOCKLOCK, authorizers, { value: 0 });
        Frozen = musig
    }

    // Deploy all contracts
    async function deployment() {
        await istantiateAccounts()
        const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
        const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
        const federations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];

        await deployErc20()

        await deployRecovery(owners,2, "RECOVERY")
        await deployTrustyCold(authorizers,2,"Cold", await Recovery.getAddress())
        await deployTrustyFrozen([...authorizers,...federations],3,"Frozen", await Recovery.getAddress(), authorizers)

        return true
    }

    async function deployment2() {
        await istantiateAccounts()
        const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
        const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
        const federations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];

        await deployErc20()

        await deployRecovery(owners,2, "RECOVERY")
        await deployTrustyCold(authorizers,2,"Cold", await Recovery.getAddress())
        await deployTrustyFrozen([...authorizers,...federations],3,"Frozen", await Recovery.getAddress(), authorizers)

        // Get Addresses
        const erc20addr = await Erc20.getAddress()
        const recoveryAddr = await Recovery.getAddress();
        const frozenAddr = await Frozen.getAddress();
        const coldAddr = await Cold.getAddress();

        const amount = ethers.parseEther("1")

        await accounts.owner.sendTransaction({to: recoveryAddr, value: amount})
        await accounts.owner.sendTransaction({to: frozenAddr, value: amount})
        await accounts.owner.sendTransaction({to: coldAddr, value: amount})

        await accounts.owner.sendTransaction({to: recoveryAddr, value: amount, data: Buffer.from("fallback")})
        await accounts.owner.sendTransaction({to: frozenAddr, value: amount, data: Buffer.from("fallback")})
        await accounts.owner.sendTransaction({to: coldAddr, value: amount, data: Buffer.from("fallback")})

        return true
    }

    /**
     * CKSG
     */
    describe("Trusty contracts tests", async() => {
        it("Deploy all test", async () => {
            const result = await loadFixture(deployment);
            expect(result).to.be.equal(true)
            expect(await Erc20.getAddress() !== null)

            const checkRecoveryOwner = await Recovery.getOwners()
            const checkFrozenOwner = await Frozen.getOwners()
            const checkColdOwner = await Cold.getOwners()

            expect(checkRecoveryOwner[0]).to.be.equal(accounts.owner.address)
            expect(checkRecoveryOwner[1]).to.be.equal(accounts.randomAccount.address)
            expect(checkRecoveryOwner[2]).to.be.equal(accounts.other.address)

            expect(checkFrozenOwner[0]).to.be.equal(accounts.auth1.address)
            expect(checkFrozenOwner[1]).to.be.equal(accounts.auth2.address)
            expect(checkFrozenOwner[2]).to.be.equal(accounts.auth3.address)
            expect(checkFrozenOwner[3]).to.be.equal(accounts.fede1.address)
            expect(checkFrozenOwner[4]).to.be.equal(accounts.fede2.address)
            expect(checkFrozenOwner[5]).to.be.equal(accounts.fede3.address)
            expect(checkFrozenOwner[6]).to.be.equal(accounts.fede4.address)
            expect(checkFrozenOwner[7]).to.be.equal(accounts.fede5.address)
            expect(checkFrozenOwner[8]).to.be.equal(accounts.fede6.address)

            expect(checkColdOwner[0]).to.be.equal(accounts.auth1.address)
            expect(checkColdOwner[1]).to.be.equal(accounts.auth2.address)
            expect(checkColdOwner[2]).to.be.equal(accounts.auth3.address)
        })

        it("Erc20.sol test", async () => {
            await loadFixture(deployment)

            const erc20addr = await Erc20.getAddress()
            expect(erc20addr !== null)
            const erc20Supply = await Erc20.balanceOf(accounts.owner.address)
            expect(erc20Supply).to.be.eq(100000000000000000000000000n)

            const erc20amount = ethers.parseEther("1000")
            const erc20amount2 = ethers.parseEther("1")

            await expect(Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, 100000000000000000000000001n)).to.be.revertedWith("Balance too low")
            await expect(Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, 0)).to.be.revertedWith("Can not transfer negative value")

            const erc20approve = await Erc20.connect(accounts.owner).approve(accounts.anonymous.address, erc20amount2)
            await expect(erc20approve.wait()).to.emit(Erc20, "Approval")

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, erc20amount)
            await expect(erc20transfer.wait()).to.emit(Erc20, "Transfer")

            expect(await Erc20.totalSupply()).to.be.eq(100000000000000000000000000n)
            expect(await Erc20.name()).to.be.eq("ERC20 Token")
            expect(await Erc20.symbol()).to.be.eq("ERC")
            expect(await Erc20.decimals()).to.be.eq(18)

            expect(await Erc20.balances(accounts.owner.address)).to.equal(erc20Supply - erc20amount)            
            expect(await Erc20.allowance(accounts.owner.address, accounts.anonymous.address)).to.equal(erc20amount2)
            expect(await Erc20.balanceOf(accounts.anonymous.address)).to.equal(erc20amount)
            expect(await Erc20.balanceOf(accounts.owner.address)).to.equal(99999000000000000000000000n)
        })

        it("CKSG Custody flow test", async () => {
            // Instantiate accounts and deploy Trusties contracts
            await loadFixture(deployment)

            // Get Addresses
            const erc20addr = await Erc20.getAddress()
            const recoveryAddr = await Recovery.getAddress();
            const frozenAddr = await Frozen.getAddress();
            const coldAddr = await Cold.getAddress();

            expect(erc20addr && recoveryAddr && frozenAddr && coldAddr !== null)

            const amount = ethers.parseEther("1")

            // Start Balances
            const recoveryStartBalance = await hre.ethers.provider.getBalance(recoveryAddr);
            const frozenStartBalance = await hre.ethers.provider.getBalance(frozenAddr);
            const coldStartBalance = await hre.ethers.provider.getBalance(coldAddr);
            
            // Deposit Funds into contracts
            await expect(accounts.owner.sendTransaction({to: frozenAddr, value: amount})).to.emit(Frozen,"Deposit")
            //await expect(accounts.owner.sendTransaction({to: recoveryAddr, value: amount})).to.emit(Recovery,"Deposit")
            //await expect(accounts.owner.sendTransaction({to: coldAddr, value: amount})).to.emit(Cold,"Deposit")
            expect(await Frozen.getBalance()).to.be.eq(amount)
            //expect(await Cold.getBalance()).to.be.eq(amount)
            //expect(await Recovery.getBalance()).to.be.eq(amount)

            // FROZEN Transaction proposal
            const proposal = await Frozen.connect(accounts.auth1).submitTransaction(coldAddr, amount, Buffer.from(""), 7200);
            await expect(proposal.wait()).to.emit(Frozen,"SubmitTransaction")

            // Sholud revert an authorization from a not authorizer owner's account
            await expect(Frozen.connect(accounts.fede1).authorizeTransaction(0)).to.be.revertedWith("not an authorizer")

            // Authorize a tx from an account of Federations owners account
            const txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txAuthorize.wait()

            const txAuthorize2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await expect(txAuthorize2.wait()).to.emit(Frozen,"AuthorizeTransaction")

            // Should revert a confirmation from authorization account
            await expect(Frozen.connect(accounts.auth1).confirmTransaction(0)).to.be.revertedWith("Authorizer can not confirm")

            // Confirm a tx from a Federation owners account
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await expect(txConfirm.wait()).to.emit(Frozen,"ConfirmTransaction")

            // Should revoke a confirmation
            const txRevoke = await Frozen.connect(accounts.fede1).revokeConfirmation(0)
            await expect(txRevoke.wait()).to.emit(Frozen,"RevokeConfirmation")

            // Confirm a tx from another account of owners
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Confirm a tx from another account of owners
            const txConfirm3 = await Frozen.connect(accounts.fede3).confirmTransaction(0)
            await txConfirm3.wait()

            // Should FAIL an EXECUTION of a Transaction proposal before TIME LOCK expiration
            await mine(1).then(async () => {
                await expect(Frozen.connect(accounts.auth2).executeTransaction(0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")
            })

            // Confirm a tx from another account of owners
            const txConfirm4 = await Frozen.connect(accounts.fede4).confirmTransaction(0)
            await txConfirm4.wait()

            // Should fail an already confirmed proposal
            await expect(Frozen.connect(accounts.fede4).confirmTransaction(0)).to.be.revertedWith("tx already confirmed")

            // EXECUTE a Transaction proposal after TIME LOCK expiration
            await mine(TIME_LOCK-6).then(async () => {
                const txExecute = await Frozen.connect(accounts.auth2).executeTransaction(0)
                await expect(txExecute.wait()).to.emit(Frozen,"ExecuteTransaction")
            })

            // Should fail an already executed tx
            await expect(Frozen.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("tx already executed")

            // Should fail an not defined tx
            await expect(Frozen.connect(accounts.auth1).executeTransaction(1)).to.be.revertedWith("tx does not exist")

            // Check Balance
            const coldBalance = await Cold.getBalance();
            expect(BigInt(coldBalance)).to.equal(amount)

            // Get Trusty TXs State
            const txGet = await Frozen.getTransaction(0);
            expect(txGet[3]).to.equal(true)

            const frozenTxCount = await Frozen.getTransactionCount()
            expect(frozenTxCount).to.equal(1)

            // COLD Transaction proposal
            const coldProposal = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, 1n, Buffer.from(""), 0);
            await coldProposal.wait();

            const coldTxCount = await Cold.getTransactionCount()
            expect(coldTxCount).to.equal(1)

            // Confirm a tx from an account of owners
            const txColdConfirm = await Cold.connect(accounts.auth1).confirmTransaction(0)
            await txColdConfirm.wait()

            // Confirm a tx from an account of owners
            const txColdConfirm1 = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txColdConfirm1.wait()

            // Revoke a confirmation
            const txColdRevoke = await Cold.connect(accounts.auth2).revokeConfirmation(0)
            await txColdRevoke.wait()

            // Confirm a tx from an account of owners
            const txColdConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txColdConfirm2.wait()

            // EXECUTE
            await mine(TIME_LOCK + BLOCKLOCK).then(async () => {
                const txColdExecute = await Cold.connect(accounts.auth2).executeTransaction(0)
                await txColdExecute.wait()

                // Get Trusty TXs State
                const txGet = await Cold.getTransaction(0);
                expect(txGet[3]).to.equal(true)
            })

            // Should fail an already executed
            await expect(Cold.connect(accounts.auth2).executeTransaction(0)).to.be.revertedWith("tx already executed")

            // Should fail a not defined transaction
            await expect(Cold.connect(accounts.auth2).executeTransaction(1)).to.be.revertedWith("tx does not exist")

            const coldFinalBalance = await hre.ethers.provider.getBalance(coldAddr)
            const trustyBalance = await Cold.getBalance()

            expect(coldFinalBalance).to.be.equal(trustyBalance && 999999999999999999n)
        })

        describe("Frozen tests", async () => {
            it("TrustyFrozen test", async () => {
                // Instantiate accounts and deploy Trusties contracts
                await loadFixture(deployment2)
    
                // Get Addresses
                const erc20addr = await Erc20.getAddress()
                const recoveryAddr = await Recovery.getAddress();
                const frozenAddr = await Frozen.getAddress();
                const coldAddr = await Cold.getAddress();
            })

            it("Deploy test", async () => {
                await istantiateAccounts()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                const federations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
                
                const invalidAuthorizers = [accounts.auth1.address,accounts.auth2.address,"0x0000000000000000000000000000000000000000"]
                const invalidFederations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];

                const duplicatedAuthorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth2.address]
                const duplicatedFederations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede5.address];

                const recoveryAddr = accounts.anonymous.address

                //await expect(deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, authorizers))
                await expect(deployTrustyFrozen([],3,"Frozen", recoveryAddr, authorizers)).to.be.revertedWith("owners required")
                await expect(deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, [])).to.be.revertedWith("authorizers required")
                await expect(deployTrustyFrozen([...authorizers, ...federations],0,"Frozen", recoveryAddr, authorizers)).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployTrustyFrozen([...authorizers, ...federations],10,"Frozen", recoveryAddr, authorizers)).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployTrustyFrozen([...invalidAuthorizers, ...federations],3,"Frozen", recoveryAddr, authorizers)).to.be.revertedWith("invalid owner")
                await expect(deployTrustyFrozen([...duplicatedAuthorizers, ...federations],3,"Frozen", recoveryAddr, authorizers)).to.be.revertedWith("owner not unique")
                await expect(deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, invalidAuthorizers)).to.be.revertedWith("invalid authorizer")
                await expect(deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, duplicatedAuthorizers)).to.be.revertedWith("authorizer not unique")
                await expect(deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", "0x0000000000000000000000000000000000000000", authorizers)).to.be.revertedWith("invalid Recovery address")
            })

            it("Submit tx proposal test", async () => {
                await istantiateAccounts()
                
                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                await deployRecovery(owners,2, "RECOVERY")
                const recoveryAddr = await Recovery.getAddress()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                const federations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];

                await deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, authorizers)
                const frozenAddr = await Frozen.getAddress()

                const amount = ethers.parseEther("1")
                //await accounts.owner.sendTransaction({to: frozenAddr, value: amount})

                // FROZEN Transaction proposal
                await Frozen.connect(accounts.auth1).submitTransaction(frozenAddr, amount, Buffer.from(""), 7200)

                // Should revert a proposal from not authorizer
                await expect(Frozen.connect(accounts.anonymous).submitTransaction(frozenAddr, amount, Buffer.from(""), 0)).to.be.revertedWith("not an authorizer")

                // Should revert confirmation from not owner
                await expect(Frozen.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith("not owner")

                // Authorize a tx from an account of Authorizers owners account
                let txAuthorize = await Frozen.connect(accounts.auth1).authorizeTransaction(0)
                await txAuthorize.wait()
                
                // Confirm a tx from another account of owners
                let txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
                await txConfirm.wait()
                
                txConfirm = await Frozen.connect(accounts.fede2).confirmTransaction(0)
                await txConfirm.wait()

                // FAIL BRANCHES
                await expect(Frozen.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

                // Should fail confirmation of undefined tx
                await expect(Frozen.connect(accounts.auth1).confirmTransaction(1)).to.be.revertedWith("tx does not exist")

                // Should fail already authorized tx
                await expect(Frozen.connect(accounts.auth1).authorizeTransaction(0)).to.be.revertedWith("tx already authorized")

                // Should fail authorization of undefined tx
                await expect(Frozen.connect(accounts.auth1).authorizeTransaction(1)).to.be.revertedWith("tx does not exist")

                // Should fail revocation of undefined tx
                await expect(Frozen.connect(accounts.fede1).revokeConfirmation(1)).to.be.revertedWith("tx does not exist")

                // Should fail revocation of not owner
                await expect(Frozen.connect(accounts.anonymous).revokeConfirmation(1)).to.be.revertedWith("not owner")
                
                txConfirm = await Frozen.connect(accounts.fede3).confirmTransaction(0)
                await txConfirm.wait()

                let txRevoke = await Frozen.connect(accounts.fede3).revokeConfirmation(0)
                await txRevoke.wait()

                // Should fail already revoked tx
                await expect(Frozen.connect(accounts.fede3).revokeConfirmation(0)).to.be.revertedWith("tx not confirmed")

                txConfirm = await Frozen.connect(accounts.fede3).confirmTransaction(0)
                await txConfirm.wait()

                // Should fail already confirmed tx
                await expect(Frozen.connect(accounts.fede3).confirmTransaction(0)).to.be.revertedWith("tx already confirmed")

                await expect(Frozen.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("authorization required")

                txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
                await txAuthorize.wait()

                await expect(Frozen.connect(accounts.auth1).executeTransaction(0)).to.be.reverted
                
                // EXECUTE a Transaction proposal after TIME LOCK expiration
                await mine(TIME_LOCK - 6).then(async () => {
                    // EXECUTE a Transaction proposal after TIME LOCK but without FUNDS
                    await expect(Frozen.connect(accounts.auth2).executeTransaction(0)).to.be.revertedWith("tx failed")

                    // Should fail execution from not owner
                    await expect(Frozen.connect(accounts.fede1).executeTransaction(0)).to.be.revertedWith("not an authorizer")
                    
                    await accounts.owner.sendTransaction({to: frozenAddr, value: amount})
                    
                    let txExecute = await Frozen.connect(accounts.auth2).executeTransaction(0)
                    await expect(txExecute.wait()).to.emit(Frozen,"ExecuteTransaction")
                })

                // Should fail revocation of already executed tx
                await expect(Frozen.connect(accounts.fede1).revokeConfirmation(0)).to.be.revertedWith("tx already executed")

                // Should fail confirmation already executed tx
                await expect(Frozen.connect(accounts.fede3).confirmTransaction(0)).to.be.revertedWith("tx already executed")

                // Should fail already authorized tx
                await expect(Frozen.connect(accounts.auth1).authorizeTransaction(0)).to.be.revertedWith("tx already executed")

                // Should fail already executed tx
                await expect(Frozen.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("tx already executed")
                
                // Should fail execution of undefined tx
                await expect(Frozen.connect(accounts.auth1).executeTransaction(1)).to.be.revertedWith("tx does not exist")
                

                const txGet = await Frozen.getTransaction(0);
                expect(txGet[3]).to.equal(true)
            })

            it("Recovery test", async () => {
                await istantiateAccounts()

                await deployErc20()
                const erc20Addr = await Erc20.getAddress()
                
                const recoOwners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                await deployRecovery(recoOwners,2, "RECOVERY")
                const recoveryAddr = await Recovery.getAddress()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                const federations = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];

                await deployTrustyFrozen([...authorizers, ...federations],3,"Frozen", recoveryAddr, authorizers)
                const frozenAddr = await Frozen.getAddress()

                const amount = ethers.parseEther("1")
                //await accounts.owner.sendTransaction({to: frozenAddr, value: amount})

                const erc20amount = ethers.parseEther("100000000")

                const erc20transfer = await Erc20.connect(accounts.owner).transfer(frozenAddr, erc20amount)
                await erc20transfer.wait()

                // RECOVER

                //0xce746024 //0x7c0f1ee7
                const recoverEth = await Recovery.connect(accounts.owner).submitTransaction(frozenAddr, 0, "0xce746024");
                await recoverEth.wait()

                let confirm = await Recovery.connect(accounts.owner).confirmTransaction(0);
                await confirm.wait()

                let confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm2.wait()

                // ERC20 Recovery
                const erc20recover = await Recovery.connect(accounts.owner).submitTransaction(frozenAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
                await erc20recover.wait()

                // Should fail recover by not Recovery address
                await expect(Frozen.connect(accounts.owner).recoverERC20(erc20Addr)).to.be.revertedWith("Not allowed!")

                confirm = await Recovery.connect(accounts.owner).confirmTransaction(1);
                await confirm.wait()

                confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
                await confirm2.wait()

                // Should fail ERC20 Recovery if not unlocked
                await expect(Recovery.connect(accounts.owner).executeTransaction(1)).to.be.revertedWith("tx failed") // with full trace enabled error is: TrustyFrozen not yet unlocked!

                // Should fail recover by not Recovery address
                await expect(Frozen.connect(accounts.owner).recover()).to.be.revertedWith("Not allowed!")

                // Should fail confirmation of undefined tx
                await expect(Recovery.connect(accounts.owner).confirmTransaction(2)).to.be.revertedWith("tx does not exist")

                // Should fail revocation of undefined tx
                await expect(Recovery.connect(accounts.owner).revokeConfirmation(2)).to.be.revertedWith("tx does not exist")

                // Should revert an execution from not owner
                await expect(Recovery.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("not owner")

                // Should revert an execution of undefined tx
                await expect(Recovery.connect(accounts.owner).executeTransaction(2)).to.be.revertedWith("tx does not exist")
                
                // Should revert an execution if BLOCKLOCK has not expired
                await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx failed")

                await mine(BLOCKLOCK + 113).then(async () => {
                    // Should fail if no amount to be recovered
                    await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx failed")
                    await accounts.owner.sendTransaction({to: frozenAddr, value: amount})

                    const executeRecoverEth = await Recovery.connect(accounts.owner).executeTransaction(0);
                    await executeRecoverEth.wait();
                    expect(await Frozen.getBalance()).to.be.eq(0n)
                    expect(await Recovery.getBalance()).to.be.eq(1000000000000000000n)
                })

                await mine(BLOCKLOCK + 113).then(async () => {
                    // Should revert an already executed tx
                    await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx already executed")
                    
                    const executeRecoverErc20 = await Recovery.connect(accounts.owner).executeTransaction(1);
                    await executeRecoverErc20.wait();

                    expect(await Erc20.balanceOf(recoveryAddr)).to.be.eq(100000000000000000000000000n)

                    // Get Trusty TXs State
                    const txGet = await Recovery.getTransaction(1);
                    expect(txGet[3]).to.equal(true)
                })
            })
        })        

        describe("Cold tests", async () => {
            it("TrustyCold test", async () => {
                await loadFixture(deployment2)

                // Get Addresses
                const erc20addr = await Erc20.getAddress()
                const recoveryAddr = await Recovery.getAddress();
                const frozenAddr = await Frozen.getAddress();
                const coldAddr = await Cold.getAddress();
            })

            it("Deploy test", async () => {
                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                const invalidAuthorizers = [accounts.auth1.address,accounts.auth2.address,"0x0000000000000000000000000000000000000000"]
                const duplicatedAuthorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth2.address]

                const recoveryAddr = accounts.anonymous.address
                
                //await deployTrustyCold(authorizers,2,"Cold", await Recovery.getAddress())
                await expect(deployTrustyCold([],3,"Frozen", recoveryAddr)).to.be.revertedWith("owners required")
                await expect(deployTrustyCold(authorizers,0,"Frozen", recoveryAddr)).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployTrustyCold(authorizers,4,"Frozen", recoveryAddr)).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployTrustyCold(invalidAuthorizers,3,"Frozen", recoveryAddr)).to.be.revertedWith("invalid owner")
                await expect(deployTrustyCold(duplicatedAuthorizers,3,"Frozen", recoveryAddr)).to.be.revertedWith("owner not unique")
                await expect(deployTrustyCold(authorizers,3,"Frozen", "0x0000000000000000000000000000000000000000")).to.be.revertedWith("invalid Recovery address")
            })

            it("Submit tx proposal test", async () => {
                await istantiateAccounts()

                const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                await deployRecovery(owners,2, "RECOVERY")
                const recoveryAddr = await Recovery.getAddress()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]

                await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
                const coldAddr = await Cold.getAddress()

                const amount = ethers.parseEther("1")
                //await accounts.owner.sendTransaction({to: frozenAddr, value: amount})

                // COLD Transaction proposal
                await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 0)

                // Should revert a proposal from not authorizer
                await expect(Cold.connect(accounts.anonymous).submitTransaction(coldAddr, amount, Buffer.from(""), 0)).to.be.revertedWith("not owner")
                
                // Confirm a tx from another account of owners
                let txConfirm = await Cold.connect(accounts.auth1).confirmTransaction(0)
                await txConfirm.wait()

                let revokeConfirm = await Cold.connect(accounts.auth1).revokeConfirmation(0)
                await revokeConfirm.wait()

                // Should fail already revoked tx
                await expect(Cold.connect(accounts.auth1).revokeConfirmation(0)).to.be.revertedWith("tx not confirmed")

                // Should fail undefined revoked tx
                await expect(Cold.connect(accounts.auth1).revokeConfirmation(1)).to.be.revertedWith("tx does not exist")

                txConfirm = await Cold.connect(accounts.auth1).confirmTransaction(0)
                await txConfirm.wait()

                // FAIL BRANCHES
                await expect(Cold.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

                // Should fail confirmation of undefined tx
                await expect(Cold.connect(accounts.auth1).confirmTransaction(1)).to.be.revertedWith("tx does not exist")

                // Should fail already confirmed tx
                await expect(Cold.connect(accounts.auth1).confirmTransaction(0)).to.be.revertedWith("tx already confirmed")

                // Should fail confirmation from not owner
                await expect(Cold.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith("not owner")

                // Should fail revocation from not owner
                await expect(Cold.connect(accounts.anonymous).revokeConfirmation(0)).to.be.revertedWith("not owner")

                // Should fail execution from not owner
                await expect(Cold.connect(accounts.anonymous).executeTransaction(0)).to.be.revertedWith("not owner")
                
                txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
                await txConfirm.wait()

                // FAIL Execute before TIMELOCK
                await expect(Cold.connect(accounts.auth1).executeTransaction(0)).to.be.reverted
                
                // EXECUTE a Transaction proposal after TIME LOCK expiration
                await mine(BLOCKLOCK + 6).then(async () => {
                    // EXECUTE a Transaction proposal after TIME LOCK but without FUNDS
                    await expect(Cold.connect(accounts.auth2).executeTransaction(0)).to.be.revertedWith("tx failed")
                    
                    await accounts.owner.sendTransaction({to: coldAddr, value: amount})

                    let txExecute = await Cold.connect(accounts.auth2).executeTransaction(0)
                    await expect(txExecute.wait()).to.emit(Cold,"ExecuteTransaction")
                })

                // Should fail confirmation of already executed tx
                await expect(Cold.connect(accounts.auth1).confirmTransaction(0)).to.be.revertedWith("tx already executed")

                // Should fail revokation of already executed tx
                await expect(Cold.connect(accounts.auth1).revokeConfirmation(0)).to.be.revertedWith("tx already executed")

                // Shoul fail an already executed tx
                await expect(Cold.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("tx already executed")
                
                // Shoul fail execution of not defined tx
                await expect(Cold.connect(accounts.auth1).executeTransaction(1)).to.be.revertedWith("tx does not exist")
            })

            it("Recovery test", async () => {
                await istantiateAccounts()

                await deployErc20()
                const erc20Addr = await Erc20.getAddress()
                
                const recoOwners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                await deployRecovery(recoOwners,2, "RECOVERY")
                const recoveryAddr = await Recovery.getAddress()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]

                await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
                const coldAddr = await Cold.getAddress()

                const amount = ethers.parseEther("1")
                await accounts.owner.sendTransaction({to: coldAddr, value: amount})

                const erc20amount = ethers.parseEther("100000000")

                const erc20transfer = await Erc20.connect(accounts.owner).transfer(coldAddr, erc20amount)
                await erc20transfer.wait()

                // RECOVER

                //0xce746024 //0x7c0f1ee7
                const recoverEth = await Recovery.connect(accounts.owner).submitTransaction(coldAddr, 0, "0xce746024");
                await recoverEth.wait()

                expect(await Recovery.getTransactionCount()).to.be.eq(1)

                // Should fail recover by not recovery address
                await expect(Cold.connect(accounts.owner).recover()).to.be.revertedWith("Not allowed!")

                let confirm = await Recovery.connect(accounts.owner).confirmTransaction(0);
                await confirm.wait()

                let revoke = await Recovery.connect(accounts.owner).revokeConfirmation(0);
                await revoke.wait()

                // Should revert revocation of undefined tx
                await expect(Recovery.connect(accounts.owner).revokeConfirmation(3)).to.be.revertedWith("tx does not exist")

                let confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm2.wait()

                let confirm3 = await Recovery.connect(accounts.other).confirmTransaction(0);
                await confirm3.wait()

                // Should revert an execution from not owner
                await expect(Recovery.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("not owner")
                
                const executeRecoverEth = await Recovery.connect(accounts.owner).executeTransaction(0);
                await executeRecoverEth.wait();
                expect(await Cold.getBalance()).to.be.eq(0n)
                

                // ERC20 Recovery
                const erc20recover = await Recovery.connect(accounts.owner).submitTransaction(coldAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
                await erc20recover.wait()

                confirm = await Recovery.connect(accounts.owner).confirmTransaction(1);
                await confirm.wait()

                confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
                await confirm2.wait()

                // Should fail recover by not recovery address
                await expect(Cold.connect(accounts.owner).recoverERC20(erc20Addr)).to.be.revertedWith("Not allowed!")

                // Should revert confirmation of undefined tx
                await expect(Recovery.connect(accounts.owner).confirmTransaction(3)).to.be.revertedWith("tx does not exist")

                // Should revert an already executed tx
                await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx already executed")

                // Should revert execution of an undefined tx
                await expect(Recovery.connect(accounts.owner).executeTransaction(3)).to.be.revertedWith("tx does not exist")
                
                const executeRecoverErc20 = await Recovery.connect(accounts.owner).executeTransaction(1);
                await executeRecoverErc20.wait();

                // Get Trusty TXs State
                const txGet = await Recovery.getTransaction(1);
                expect(txGet[3]).to.equal(true)

                expect(await Erc20.balanceOf(recoveryAddr)).to.be.eq(100000000000000000000000000n)
            })
        })
        
        describe("Recovery tests", async () => {
            it("Recovery coverage test", async () => {
                await loadFixture(deployment)
    
                const erc20addr = await Erc20.getAddress()

                await istantiateAccounts()

                await deployErc20()
                const erc20Addr = await Erc20.getAddress()
                
                const recoOwners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
                await deployRecovery(recoOwners,2, "RECOVERY")
                const recoveryAddr = await Recovery.getAddress()

                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
                const coldAddr = await Cold.getAddress()

                const amount = ethers.parseEther("1")
                //await accounts.owner.sendTransaction({to: coldAddr, value: amount})

                const erc20amount = ethers.parseEther("100000000")

                const erc20transfer = await Erc20.connect(accounts.owner).transfer(coldAddr, erc20amount)
                await erc20transfer.wait()

                const recoverEth = await Recovery.connect(accounts.owner).submitTransaction(coldAddr, 0, "0xce746024");
                await recoverEth.wait()

                expect(await Recovery.getTransactionCount()).to.be.eq(1)

                let confirm = await Recovery.connect(accounts.owner).confirmTransaction(0);
                await confirm.wait()

                let revoke = await Recovery.connect(accounts.owner).revokeConfirmation(0);
                await revoke.wait()

                let confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm2.wait()

                // Should revert an execution without required confirmation
                await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

                let confirm3 = await Recovery.connect(accounts.other).confirmTransaction(0);
                await confirm3.wait()

                // Should revert if no amount to be recovered
                await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx failed") // with full trace enabled error is: no amount!

                await accounts.owner.sendTransaction({to: coldAddr, value: amount})

                // Should revert confirmation from not owner
                await expect(Recovery.connect(accounts.anonymous).confirmTransaction(0)).to.be.revertedWith("not owner")

                // Should revert an already confirmed tx
                await expect(Recovery.connect(accounts.randomAccount).confirmTransaction(0)).to.be.revertedWith("tx already confirmed")

                // Should revert an undefined tx
                await expect(Recovery.connect(accounts.randomAccount).confirmTransaction(1)).to.be.revertedWith("tx does not exist")

                // Should revert an execution from not owner
                await expect(Recovery.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith("not owner")

                // Should revert an execution of undefined tx
                await expect(Recovery.connect(accounts.owner).executeTransaction(1)).to.be.revertedWith("tx does not exist")
                
                // Should fail revokation of not confirmed tx
                await expect(Recovery.connect(accounts.owner).revokeConfirmation(0)).to.be.revertedWith("tx not confirmed")

                // Should fail without balance
                //await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx failed")

                let execute = await Recovery.connect(accounts.other).executeTransaction(0);
                await execute.wait()

                // Should fail revokation of already executed tx
                await expect(Recovery.connect(accounts.owner).revokeConfirmation(0)).to.be.revertedWith("tx already executed")

                // ERC20 Recovery
                const erc20recover = await Recovery.connect(accounts.owner).submitTransaction(recoveryAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
                await erc20recover.wait()

                confirm = await Recovery.connect(accounts.owner).confirmTransaction(1);
                await confirm.wait()

                confirm2 = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
                await confirm2.wait()

                // Should fail an already executed tx
                await expect(Recovery.connect(accounts.owner).executeTransaction(0)).to.be.revertedWith("tx already executed")

                // Should fail confirmation of an already executed tx
                await expect(Recovery.connect(accounts.owner).confirmTransaction(0)).to.be.revertedWith("tx already executed")

                // Should fail revokation from not owner
                await expect(Recovery.connect(accounts.anonymous).revokeConfirmation(0)).to.be.revertedWith("not owner")

                // Get Trusty TXs State
                const txGet = await Recovery.getTransaction(1);
                expect(txGet[3]).to.equal(false)
            })

            it("Deploy", async () => {
                const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
                const invalidAuthorizers = [accounts.auth1.address,accounts.auth2.address,"0x0000000000000000000000000000000000000000"]
                const duplicatedAuthorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth2.address]
                
                await expect(deployRecovery([],3,"Recovery")).to.be.revertedWith("owners required")
                await expect(deployRecovery(authorizers,0,"Recovery")).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployRecovery(authorizers,4,"Recovery")).to.be.revertedWith("invalid number of required confirmations")
                await expect(deployRecovery(invalidAuthorizers,3,"Recovery")).to.be.revertedWith("invalid owner")
                await expect(deployRecovery(duplicatedAuthorizers,3,"Recovery")).to.be.revertedWith("owner not unique")
            })
        })

        describe("Utils tests", async () => {
            it("calldata test", async () => {
                const test = "0x30"
                const approve = "0x095ea7b3000000000000000000000000277F0FE830e78055b2765Fa99Bfa52af4482E1510000000000000000000000000000000000000000000000000de0b6b3a7640000"
                const transfer = "0xa9059cbb000000000000000000000000277F0FE830e78055b2765Fa99Bfa52af4482E1510000000000000000000000000000000000000000000000000de0b6b3a7640000"
                const por = "0x5c470ecb"
                const recover = "0xce746024"
                const recoverErc20 = "0x9e8c708e0000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238"                
                const recoverErc20Other = "0x9e8c708e000000000000000000000000779877a7b0d9e8603169ddbd7836e478b4624789"

                decodeCalldata(test)
                decodeCalldata(approve)
                decodeCalldata(transfer)
                decodeCalldata(por)
                decodeCalldata(recover)
                decodeCalldata(recoverErc20)
                decodeCalldata(recoverErc20Other)
                decodeCalldata("Testing a normal string... 0123456789@!#€₿✅")
            })
        })
    })
});

