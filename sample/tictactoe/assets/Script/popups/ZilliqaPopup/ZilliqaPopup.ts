// Learn TypeScript:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

import { 
    ZilliqaNetwork, 
    TicTacToeBinding,
    GameProfile
} from '../..';

import ErrorPopup from '../ErrorPopup';
import AuthenticationPopup from './AuthenticationPopup';
import ContractsPopup from './ContractsPopup'

@ccclass
export default class ZilliqaPopup extends cc.Component {

    @property(cc.Node)
    offChainNode: cc.Node = null;

    @property(AuthenticationPopup)
    authenticationPopup: AuthenticationPopup = null;

    @property(cc.Node)
    onChainNode: cc.Node = null;

    @property(cc.EditBox)
    addressEditBox: cc.EditBox = null;

    @property(ContractsPopup)
    contractsPopup: ContractsPopup = null;

    @property(cc.Node)
    connectingNode: cc.Node = null;

    @property(ErrorPopup)
    errorPopup: ErrorPopup = null;

    @property(ErrorPopup)
    messagePopup: ErrorPopup = null;

    
    @property(cc.Label)
    responseText: cc.Label = null;

    @property(cc.Node)
    minimizeLayer: cc.Node = null;

    @property(cc.Node)
    maximizeLayer: cc.Node = null;

    @property(cc.Label)
    networkLabel: cc.Label = null;

    @property(cc.Label)
    balanceLabel: cc.Label = null;

    @property(cc.Label)
    balanceRequireNodeLabel: cc.Label = null;

    // LIFE-CYCLE CALLBACKS:

    //onLoad () {}

    start () {
        var minBalanceString = ZilliqaNetwork.BALANCE_REQUIRE.toString(10);
        var z = 0;
        for(let i=minBalanceString.length - 1;i>=0;i--){
            if(minBalanceString[i] != '0') break;
            z++;
        }
        if(z > 0 && minBalanceString != '0'){
            minBalanceString = minBalanceString.substr(0, minBalanceString.length - z) + "x10^" + z.toString();
        }
        this.balanceRequireNodeLabel.string = "Make sure you have at least " + minBalanceString + "Qa to deploy contract. Click on lelt button if you want some.";

        if(ZilliqaNetwork.getInstance().wasAuthenticated()){
            this.offChainNode.active = false;
            this.onChainNode.active = true;
            this.onMinimize();
            this.addressEditBox.string = ZilliqaNetwork.getInstance().getUserAddress();
            this.getBalance();
        } else{
            this.offChainNode.active = true;
            this.onChainNode.active = false;
            this.onMaximize();
            this.addressEditBox.string = "";
        }
        console.log('ZilliqaPopup start');   
        this.authenticationPopup.node.active = false;
        
        this.contractsPopup.node.active = false;
        this.connectingNode.active = false;
        this.errorPopup.node.active = false;
        this.messagePopup.node.active = false;
        

        var that = this;
        this.authenticationPopup.node.on('error', (msg:string) => {
            that.errorPopup.show(msg);
        });

        this.authenticationPopup.node.on('authorized', (msg:string) => {
            that.authenticationPopup.node.active = false;
            that.onChainNode.active = true;
            console.log('authorized');   
            GameProfile.getInstance().loadProfile(ZilliqaNetwork.getInstance().getUserAddress());
            that.onMinimize();
            that.node.emit('loggedin');
            that.restoreAddressEditBox();
            that.getBalance();
        });
        
        this.contractsPopup.node.on('hide', () => {
            that.contractsPopup.node.active = false;
            that.onChainNode.active = true;
        });

        this.contractsPopup.node.on('showPopup', (msg:string) => {
            that.showPopup(msg);
        });

        this.contractsPopup.node.on('getContractInit', this.getContractInit, this);
        this.contractsPopup.node.on('getContractState', this.getContractState, this);
        this.contractsPopup.node.on('getContractCode', this.getContractCode, this);
        this.contractsPopup.node.on('verifyContract', this.activeTictactoeContract, this);        
    }

    restoreAddressEditBox(){
        this.addressEditBox.string = ZilliqaNetwork.getInstance().getUserAddress();
    }

    updateBalance(data){
        this.balanceLabel.string = "" + (data.balance || 0);
    }

    onMaximize(){
        this.maximizeLayer.active = true;
        this.minimizeLayer.active = false;
    }

    onMinimize(){
        this.maximizeLayer.active = false;
        this.minimizeLayer.active = true;
        this.node.emit('minimize');
    }

    handleError(err, data){        
        if (err) {
            this.errorPopup.show(err);
            this.responseText.string = err;
        } else if (data.error) {
            this.errorPopup.show(data.error.message);
            this.responseText.string = JSON.stringify(data.error);
        }
    }

    showPopup(msg:string) {
        this.messagePopup.show(msg);
    }

    onConnect(){
        var that = this;
        this.connectingNode.active = true;

        let URL = 'https://api.zilliqa.com/';
        //let URL = 'https://api-scilla.zilliqa.com';
        ZilliqaNetwork.getInstance().connect(URL, function(err, data) {
            if (err || data.error) {                         
                that.handleError(err, data);
            } else {
                that.offChainNode.active = false;
                that.authenticationPopup.show();
                //that.onChainNode.active = true;
                that.responseText.string = data.result;
                that.networkLabel.string = data.result;
            }
            that.connectingNode.active = false;
        });
    }

    onLogout() {
        if(ZilliqaNetwork.getInstance().wasAuthenticated()){
            ZilliqaNetwork.getInstance().logOut();
            this.addressEditBox.string = '';
            this.onChainNode.active = false;
            this.node.emit('loggedout');
            this.authenticationPopup.show();            
        }
    }

    getBalance(){
        var that = this;
        this.connectingNode.active = true;
        ZilliqaNetwork.getInstance().getBalance('', function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {               
                that.responseText.string = JSON.stringify(data.result);
                that.updateBalance(data.result);
            }
            that.connectingNode.active = false;
        });
    }

    getNetworkId(){
        var that = this;
        this.connectingNode.active = true;
        ZilliqaNetwork.getInstance().getNetworkId(function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {            
                that.responseText.string = JSON.stringify(data.result);
            }
            that.connectingNode.active = false;
        });
    }

    sendFaucetRequest() {
        var that = this;
        this.connectingNode.active = true;
        ZilliqaNetwork.getInstance().sendFaucetRequest(function(err) {
            if (err) {                
                that.handleError(err, {});
            } else {            
                that.responseText.string = 'Done';
                that.getBalance();
            }
            that.connectingNode.active = false;
        });
    }

    getSmartContracts(){
        var that = this;
        this.connectingNode.active = true;
        ZilliqaNetwork.getInstance().getSmartContracts(function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {               
                //that.responseText.string = JSON.stringify(data.result);
                that.contractsPopup.show(data.result || []);
            }
            that.connectingNode.active = false;
        });
    }

    deployTicTacToe(){
        var that = this;
        this.connectingNode.active = true;

        GameProfile.getInstance().getTictactoeCode((data) => {        
            if(data.code == ''){                    
                that.handleError('Code not found!', {});
                that.connectingNode.active = false;
                return;                
            }
            var binding = new TicTacToeBinding();
            //binding.setContractCode(code);
            var init = binding.getContractInit(ZilliqaNetwork.getInstance().getUserAddress(), data.checksum);

            ZilliqaNetwork.getInstance().deployContract(data.code, init, function(err, hello) {
                if (err) {                
                    that.handleError(err, {});
                    that.connectingNode.active = false;
                } else {
                    that.responseText.string = 'Deployed to ' + hello.address + '. Calling setHello';
                    that.connectingNode.active = false;
                }      
                that.getBalance();      
            });
        });        
    }

    
    getContractInit(contractAddress: string) {
        console.log('getInit c');
        this.connectingNode.active = true;
        var that = this;
        ZilliqaNetwork.getInstance().getSmartContractInit(contractAddress, function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {                            
                that.showPopup(JSON.stringify(data.result));
            }
            that.connectingNode.active = false; 
        });
    }

    getContractState(contractAddress: string) {
        this.connectingNode.active = true;
        var that = this;
        ZilliqaNetwork.getInstance().getSmartContractState(contractAddress, function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {                            
                that.showPopup(JSON.stringify(data.result));
            }
            that.connectingNode.active = false;             
        });
    }

    getContractCode(contractAddress: string) {
        this.connectingNode.active = true;
        var that = this;

        ZilliqaNetwork.getInstance().getSmartContractCode(contractAddress, function(err, data) {
            if (err || data.error) {                
                that.handleError(err, data);
            } else {                            
                that.showPopup(data.result.code);                
            }
            that.connectingNode.active = false; 
        });
    }

    activeTictactoeContract(contractAddress: string) {
        this.connectingNode.active = true;
        var that = this;
        
        GameProfile.getInstance().getTictactoeCode((code) => {        
            if(code == ''){                    
                that.handleError('Code not found!', {});
                that.connectingNode.active = false;
                return;                
            }
            ZilliqaNetwork.getInstance().getSmartContractCode(contractAddress, function(err, data) {
                if (err || data.error) {                
                    that.handleError(err, data);
                } else if(code != data.result.code){
                    that.handleError('Code not matched!', {});                    
                } else{
                    //that.showPopup(data.result.code);
                }
                that.connectingNode.active = false;
                GameProfile.getInstance().setActiveTicTacToeAddress(contractAddress);
                that.contractsPopup.refresh();
                that.node.emit('activecontract', contractAddress);
            });
        });
    }

    // update (dt) {}
}
