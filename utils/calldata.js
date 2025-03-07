const createKeccakHash = require('keccak')

function decodeCalldata(data) {
    /**
     * - approve(address,uint256) = 0x095ea7b3
     * - transfer(address,uint256) = 0xa9059cbb
     * - POR() = 0x5c470ecb
     * - recover() = 0xce746024
     * - recoverERC20(address) = 0x9e8c708e
     */

    try {      
        let decodedString = ''
        const decoded = data.slice(2)
        const buffer = Buffer.from(decoded, 'hex')
        const bufferLength = buffer.length
        const selector = buffer.subarray(0,4)
        const args = buffer.subarray(4)
        const argLength = args.length
        const argNum = argLength / 32
        /*
        console.log("[RAW]: ", data)
        console.log("[LEN]: ", bufferLength)
        console.log(buffer)
        console.log("[DECODED]: ", decoded)
        console.log("[SELECTOR]: ", selector)
        console.log("[ARG LEN]: ", argLength)
        console.log("[ARG NUM]: ", argNum)
        console.log("[ARGS]: ", args)
        */
        const argument = []
        let ptr = 0

        for (let i = 0; i < argNum; i++) {
            const buf = Buffer.from(args).subarray(ptr, ptr+32)
            argument.push(buf)
            ptr += 32
        }

        //console.log("[ARGS]: ", argument)
        
        switch (Buffer.from(selector, 'hex').toString('hex')) {
            case "095ea7b3":
                //console.log("[Decoded CALLDATA]: *** approve(address,uint256) ***")
                address = (argument[0]).toString('hex').replace(/^0x00*/, '').replace(/^00*/, '')
                amount = Number(`0x${argument[1].toString('hex').replace(/^00*/, '')}`)
                //console.log(`address: ${toChecksumAddress(address)} | amount: ${amount}`)
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `approve(address,uint256) | address: ${toChecksumAddress(address)} | amount: ${amount}`
                break
            case "a9059cbb":
                //console.log("[Decoded CALLDATA]:*** transfer(address,uint256) ***")
                address = (argument[0]).toString('hex').replace(/^0x00*/, '').replace(/^00*/, '')
                amount = Number(`0x${argument[1].toString('hex').replace(/^00*/, '')}`)
                //console.log(`address: ${toChecksumAddress(address)} | amount: ${amount}`)
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `transfer(address,uint256) | address: ${toChecksumAddress(address)} | amount: ${amount}`
                break
            case "5c470ecb":
                //console.log("[Decoded CALLDATA]:*** POR() ***")
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `POR()`
                break
            case "ce746024":
                //console.log("[Decoded CALLDATA]:*** recover() ***")
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `recover()`
                break
            case "9e8c708e":
                //console.log("[Decoded CALLDATA]:*** recoverERC20(address) ***")
                address = (argument[0]).toString('hex').replace(/^0x00*/, '').replace(/^00*/, '')
                //console.log(`token contract: ${toChecksumAddress(address)}`)
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `recoverERC20(address) | token contract: ${toChecksumAddress(address)}`
                break
            default:
                //console.log("[ASCII]: ", Buffer.from(data).toString("ascii"))
                //console.log("[UTF8]: ", Buffer.from(data).toString("utf8"))
                //console.log(`[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`)
                decodedString = `[UTF8]: ${Buffer.from(data).toString("utf8")} | [ASCII]: ${Buffer.from(data).toString("ascii")}`
                break
        }
        console.log(decodedString)
        return decodedString
    } catch (error) {
        console.log("[ERROR decoding]: ", error)
    }
}

function toChecksumAddress (address) {
    address = address.toLowerCase().replace('0x', '')
    var hash = createKeccakHash('keccak256').update(address).digest('hex')
    var ret = '0x'
  
    for (var i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        ret += address[i].toUpperCase()
      } else {
        ret += address[i]
      }
    }
  
    return ret
  }

module.exports.decodeCalldata = decodeCalldata;