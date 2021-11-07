"use strict";

class Algo {
	constructor() {
		this.baseURL = "https://algoexplorerapi.io";
		this.asset_id = 400421216;
		this.min_bal = 100000;
	}

	async saveEntry(site, uname, pws) {
		let note = {
			website: site,
			user: uname,
			password: pws,
		}

		note = this.encrypt(note, this.mn);

		note = await algosdk.encodeObj(note);
		
		await this.saveDataTxn(note);
	}

	async saveDataTxn(data) {
		let usig = await this.getUsersig(this.acc.addr);
		let us = usig.address();
		let fsig = await this.getFundersig();
		let fn = fsig.address();

		let t1 = algosdk.makeAssetTransferTxnWithSuggestedParams(us, fn, undefined, undefined, 1, undefined, this.asset_id, await this.getParams(0));
		let t2 = algosdk.makePaymentTxnWithSuggestedParams(fn, this.acc.addr, this.min_bal, undefined, undefined, await this.getParams(3));
		let t3 = algosdk.makePaymentTxnWithSuggestedParams(this.acc.addr, this.acc.addr, 0, fn, data, await this.getParams(0));

		let group = [t1, t2, t3];
		algosdk.assignGroupID(group);

		let sgroup = [
			algosdk.signLogicSigTransactionObject(t1, usig).blob,
			algosdk.signLogicSigTransactionObject(t2, fsig).blob,
			t3.signTxn(this.acc.sk),
		]

		let esgroup = this.concatArrays(sgroup);

		let tx = await this.sendRawTxn(esgroup);
	}

	async getParams(fees=1) {
		let url = this.baseURL + "/v2/transactions/params";

		let response = await fetch(url);
		let data = await response.json();

		let params = {
			firstRound: data["last-round"],
			lastRound: data["last-round"] + 1000,
			genesisID: data["genesis-id"],
			genesisHash: data["genesis-hash"],
			fee: fees*1000,
			flatFee: true,
		}

		return params;
	}

	async sendRawTxn(stxn) {
		let url = this.baseURL + "/v2/transactions";

		let response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-binary"
			},
			body: stxn
		});
		let data = await response.json();
		console.log(data);
		return data
	}

	async getLsig(teal) {
		let url = this.baseURL + "/v2/teal/compile";

		let response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-binary"
			},
			body: teal
		});

		let data = await response.json();
		let program = this.b64ToUint8Array(data.result);
		let lsig = new algosdk.LogicSigAccount(program);
		return lsig;
	}

	b64ToUint8Array(base64) {
		var binary_string = window.atob(base64);
		var len = binary_string.length;
		var bytes = new Uint8Array(len);
		for (var i = 0; i < len; i++) {
			bytes[i] = binary_string.charCodeAt(i);
		}
		return bytes;
	}

	concatArrays(arrs) {
		const size = arrs.reduce((sum, arr) => sum + arr.length, 0);
		const c = new Uint8Array(size);
	  
		let offset = 0;
		for (let i = 0; i < arrs.length; i++) {
		  c.set(arrs[i], offset);
		  offset += arrs[i].length;
		}
	  
		return c;
	}

	async getFundersig() {
		let teal = funder_teal();
		let lsig = await this.getLsig(teal);
		return lsig;
	}

	async getUsersig(user) {
		let teal = usersig_teal(user);
		let lsig = await this.getLsig(teal);
		return lsig;
	}

	async getTxns(addr) {
		let url = this.baseURL + `/idx2/v2/transactions?address=${addr}&address-role=sender&tx-type=pay`;
		let response = await fetch(url);
		let data = await response.json();
		let txns = data.transactions;
		return txns;
	}

	async getEntries() {
		let txns = await this.getTxns(this.acc.addr);

		let notes = txns.map(txn => {
			try{
				let note = txn.note;
				note = atob(note);
				note = note.slice(2);
				note = this.decrypt(note, this.mn);
				return note;
			} catch (e) {
				return undefined;
			}
		});

		notes = notes.filter(e => e !== undefined);

		return notes;
	}

	async setAcc(psw, recovery) {
		let mn;

		if (recovery) {
			mn = recovery;
		} else {
			let acc = algosdk.generateAccount();
			mn = algosdk.secretKeyToMnemonic(acc.sk);
		}

		let eMn = this.encrypt(mn, psw);
		await setCS("mn", eMn);
	}

	async getEncMn() {
		if (this.enc_mn == undefined) this.enc_mn = await getCS("mn");
		return this.enc_mn;
	}

	async getAcc(psw) {
		if (this.acc == undefined) {
			this.mn = this.decrypt(await this.getEncMn(), psw);
			this.acc = algosdk.mnemonicToSecretKey(this.mn);
		}
		return this.acc;
	}

	async clearMn() { await clearCS("mn"); }

	getNumberedMn() {
		let mn = this.mn.split(" ");
		let numbered = mn.map((word, i) => ` ${i+1}. ${word}`);
		return (""+numbered).trim();
	}

	encrypt(msg, key) {
		return CryptoJS.AES.encrypt(JSON.stringify(msg), key).toString();
	}

	decrypt(msg, key) {
		return JSON.parse(CryptoJS.AES.decrypt(msg, key).toString(CryptoJS.enc.Utf8));
	}

	getMn() { return this.mn; }

	getAddr() { return this.acc.addr; }


}

const usersig_teal = user => `#pragma version 5
global GroupSize
int 3
==
txn GroupIndex
int 1
==
&&
gtxn 0 TypeEnum
int pay
==
&&
gtxn 0 Sender
addr YS6VHU75W7KTA43XO4UJ5PP572SX6CILKKKOONOAI3HEYVNT3E77MREAYM
==
&&
gtxn 0 Receiver
txn Sender
==
&&
gtxn 0 Amount
int 2
global MinBalance
*
==
&&
gtxn 0 Fee
int 3
global MinTxnFee
*
==
&&
gtxn 0 CloseRemainderTo
global ZeroAddress
==
&&
gtxn 0 RekeyTo
global ZeroAddress
==
&&
gtxn 1 TypeEnum
int axfer
==
&&
gtxn 1 AssetReceiver
txn Sender
==
&&
gtxn 1 XferAsset
int 400421216
==
&&
gtxn 1 AssetAmount
int 0
==
&&
gtxn 1 Fee
int 0
==
&&
gtxn 1 AssetCloseTo
global ZeroAddress
==
&&
gtxn 1 RekeyTo
global ZeroAddress
==
&&
gtxn 2 TypeEnum
int axfer
==
&&
gtxn 2 Sender
addr YS6VHU75W7KTA43XO4UJ5PP572SX6CILKKKOONOAI3HEYVNT3E77MREAYM
==
&&
gtxn 2 AssetReceiver
txn Sender
==
&&
gtxn 2 XferAsset
int 400421216
==
&&
gtxn 2 Fee
int 0
==
&&
gtxn 2 AssetCloseTo
global ZeroAddress
==
&&
gtxn 2 RekeyTo
global ZeroAddress
==
&&
global GroupSize
int 3
==
txn GroupIndex
int 0
==
&&
gtxn 0 TypeEnum
int axfer
==
&&
gtxn 0 AssetReceiver
addr QPHI4C7X5U2BZN7SJELAS3S6IWWRTMFVMTNOYFDMJUNFXY2DNNV3PUSAZQ
==
&&
gtxn 0 XferAsset
int 400421216
==
&&
gtxn 0 AssetAmount
int 1
==
&&
gtxn 0 Fee
int 0
==
&&
gtxn 0 AssetCloseTo
global ZeroAddress
==
&&
gtxn 0 RekeyTo
global ZeroAddress
==
&&
gtxn 1 TypeEnum
int pay
==
&&
gtxn 1 Sender
addr QPHI4C7X5U2BZN7SJELAS3S6IWWRTMFVMTNOYFDMJUNFXY2DNNV3PUSAZQ
==
&&
gtxn 1 Receiver
addr ${user}
==
&&
gtxn 1 Amount
global MinBalance
==
&&
gtxn 1 Fee
int 3
global MinTxnFee
*
==
&&
gtxn 1 CloseRemainderTo
global ZeroAddress
==
&&
gtxn 1 RekeyTo
global ZeroAddress
==
&&
gtxn 2 TypeEnum
int pay
==
&&
gtxn 2 Sender
addr ${user}
==
&&
gtxn 2 Receiver
addr ${user}
==
&&
gtxn 2 Amount
int 0
==
&&
gtxn 2 Fee
int 0
==
&&
gtxn 2 CloseRemainderTo
addr QPHI4C7X5U2BZN7SJELAS3S6IWWRTMFVMTNOYFDMJUNFXY2DNNV3PUSAZQ
==
&&
gtxn 2 RekeyTo
global ZeroAddress
==
&&
||
return`

const funder_teal = () => `#pragma version 5
global GroupSize 
int 2
==
bnz main_l4      
global GroupSize 
int 3
==
bnz main_l3
err
main_l3:
global GroupSize
int 3
==
txn GroupIndex
int 1
==
&&
gtxn 0 TypeEnum
int axfer
==
&&
gtxn 0 AssetReceiver
txn Sender
==
&&
gtxn 0 XferAsset
int 400421216
==
&&
gtxn 0 AssetAmount
int 1
==
&&
gtxn 0 Fee
int 0
==
&&
gtxn 1 AssetCloseTo
global ZeroAddress
==
&&
gtxn 1 RekeyTo
global ZeroAddress
==
&&
gtxn 1 TypeEnum
int pay
==
&&
gtxn 1 Sender
txn Sender
==
&&
gtxn 1 Receiver
gtxn 2 Sender
==
&&
gtxn 1 Amount
global MinBalance
==
&&
gtxn 1 Fee
int 3
global MinTxnFee
*
==
&&
gtxn 1 CloseRemainderTo
global ZeroAddress
==
&&
gtxn 1 RekeyTo
global ZeroAddress
==
&&
gtxn 2 TypeEnum
int pay
==
&&
gtxn 2 Receiver
gtxn 2 Sender
==
&&
gtxn 2 Amount
int 0
==
&&
gtxn 2 Fee
int 0
==
&&
gtxn 2 CloseRemainderTo
txn Sender
==
&&
gtxn 2 RekeyTo
global ZeroAddress
==
&&
return
main_l4:
global GroupSize
int 2
==
txn GroupIndex
int 1
==
&&
gtxn 0 TypeEnum
int pay
==
&&
gtxn 0 Sender
addr YS6VHU75W7KTA43XO4UJ5PP572SX6CILKKKOONOAI3HEYVNT3E77MREAYM
==
&&
gtxn 0 Receiver
txn Sender
==
&&
gtxn 0 Fee
int 2
global MinTxnFee
*
==
&&
gtxn 0 CloseRemainderTo
global ZeroAddress
==
&&
gtxn 0 RekeyTo
global ZeroAddress
==
&&
gtxn 1 TypeEnum
int axfer
==
&&
gtxn 1 AssetReceiver
txn Sender
==
&&
gtxn 1 XferAsset
int 400421216
==
&&
gtxn 1 AssetAmount
int 0
==
&&
gtxn 1 Fee
int 0
==
&&
gtxn 1 AssetCloseTo
global ZeroAddress
==
&&
gtxn 1 RekeyTo
global ZeroAddress
==
&&
return`

