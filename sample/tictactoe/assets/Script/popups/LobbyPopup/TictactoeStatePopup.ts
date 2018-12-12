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
    GameProfile,
    TicTacToeBinding
} from '../..';

@ccclass
export default class TictactoeStatePopup extends cc.Component {

    @property(cc.Node)
    connectingNode: cc.Node = null;

    @property(cc.Label)
    titleLabel: cc.Label = null;

    @property(cc.EditBox)
    addressEditBox: cc.EditBox = null;

    @property
    addressText: string = '';

    @property(cc.Label)
    stateLabel: cc.Label = null;

    @property(cc.Label)
    joinOrAcceptLabel: cc.Label = null;

    @property(cc.Node)
    hostingUILayer: cc.Node = null;

    @property(cc.Button)
    hostingCloseButton: cc.Button = null;

    @property(cc.Label)
    hostingChangeStateLabel: cc.Label = null;

    @property(cc.Button)
    hostingAcceptButton: cc.Button = null;

    @property(cc.Node)
    joiningUILayer: cc.Node = null;

    @property(cc.Button)
    joinningJoinButton: cc.Button = null;

    @property(cc.Button)
    joinningDeleteButton: cc.Button = null;
    

    // LIFE-CYCLE CALLBACKS:
    show(address:string){
        this.node.active = true;

        this.connectingNode.active = false;
        
        this.stateLabel.string = "";

        console.log('TictactoeStatePopup address[', address, ']');
        if(address != ''){
            this.addressText = address;
            this.addressEditBox.string = this.addressText;
    
            var binding = new TicTacToeBinding();
            GameProfile.getInstance().activeTicTacToeBinding = binding;
            binding.bindFromAddress(address);
    
            this.getContractState();
            if(this.isHosting()){
                this.joinOrAcceptLabel.string = "Accept";
                this.titleLabel.string = "Hosting";            
            } else{
                this.joinOrAcceptLabel.string = "Join";
                this.titleLabel.string = "Challenge";
            }
        } else{
            this.addressText = '';
            this.addressEditBox.string = this.addressText;
            this.joinOrAcceptLabel.string = "Accept";
            this.titleLabel.string = "Hosting";
            this.deployTicTacToe();          
        }                        
    }

    
    deployTicTacToe(){
        this.stateLabel.string = "deploying TicTacToe...";
        console.log('deployTicTacToe');
        var that = this;
        this.connectingNode.active = true;

        GameProfile.getInstance().getTictactoeCode((code) => {        
            if(code == ''){                    
                //that.handleError('Code not found!', {});
                that.connectingNode.active = false;
                return;                
            }
            var binding = new TicTacToeBinding();
            var init = binding.getContractInit(ZilliqaNetwork.getInstance().getUserAddress());

            ZilliqaNetwork.getInstance().deployContract(code, init, function(err, hello) {
                if (err) {                    
                    that.connectingNode.active = false;
                } else {
                    GameProfile.getInstance().setActiveTicTacToeAddress(hello.address);
                    GameProfile.getInstance().activeTicTacToeBinding = binding; 
                    binding.bindFromContract(hello);      
                    that.connectingNode.active = false;

                    that.addressText = hello.address;
                    that.addressEditBox.string = that.addressText;
                    that.getContractState();
                }
            });
        });        
    }

    isHosting(){
        ///Todo: need to check import seft contract.
        var activeTicTacToeAddress = GameProfile.getInstance().getActiveTicTacToeAddress();
        return (activeTicTacToeAddress == this.addressText)
    }

    hide(){
        this.node.active = false;
        GameProfile.getInstance().activeTicTacToeBinding = null;
    }

    restoreAddressEditBox(){
        this.addressEditBox.string = this.addressText;
    }

    getContractState() {        
        var that = this;

        var binding = GameProfile.getInstance().activeTicTacToeBinding;        
        if(binding == null) return;

        this.hostingUILayer.active = false;
        this.joiningUILayer.active = false;
        this.connectingNode.active = true;

        
        binding.fetchState(function(err, data) {
            if(err){
                that.fillContractState(null)
            } else{
                that.fillContractState(data)
            }
            
            that.connectingNode.active = false;
        })
    }

    fillContractState(stateData){
        var userAddress = ZilliqaNetwork.getInstance().getUserAddress();
        
        if(this.isHosting()){
            this.hostingUILayer.active = true;
            this.hostingAcceptButton.interactable = false;
            this.hostingCloseButton.interactable = true;
            this.hostingChangeStateLabel.string = 'Close';
            if(stateData == null){
                this.stateLabel.string = "Contract wasn't exits";
                this.hostingChangeStateLabel.string = 'Remove';
            } else if(!stateData.opening){
                this.handleError("You closed this game.");
                this.hostingChangeStateLabel.string = 'Open Now';
            } else if(stateData.challenger != ''){
                if(stateData.accepted){
                    if(stateData.winner_code == 0){
                        this.stateLabel.string = "Playing turn " + stateData.turn.toString();;
                        cc.director.loadScene('gameplay');
                    } else{
                        this.stateLabel.string = "Game end with winner_code " + stateData.winner_code.toString();
                    }
                } else{
                    this.stateLabel.string = "You have a challenge from " + stateData.challenger + "\n" + stateData.welcome_msg;
                    this.hostingAcceptButton.interactable = true;
                }
            } else{
                this.stateLabel.string = "Waiting for a challenge...";
            }
        } else{
            this.joiningUILayer.active = true;
            this.joinningJoinButton.interactable = false;
            this.joinningDeleteButton.interactable = true;
            if(stateData == null){
                this.stateLabel.string = "Contract wasn't exits";            
            } else if(!stateData.opening){
                this.handleError("Disable by host.");
            } else if(stateData.challenger != ''){
                if(stateData.challenger.replace('0x', '').toLowerCase() == userAddress.toLowerCase()){
                    if(stateData.accepted){
                        if(stateData.winner_code == 0){
                            this.stateLabel.string = "Playing turn " + stateData.turn.toString();;
                            cc.director.loadScene('gameplay');
                        } else{
                            this.stateLabel.string = "Game end with winner_code " + stateData.winner_code.toString();
                        }
                    } else{
                        this.stateLabel.string = "Waiting for host accept your challenge";
                    }
                } else{
                    this.handleError("Host was busing");
                }
            } else{
                this.stateLabel.string = "Challenge Now!";
                this.joinningJoinButton.interactable = true;
            }
        }
    }

    handleError(err){        
        ///Todo show popup
        console.log(err);
        this.stateLabel.string = err;
    }

    onJoin(){        
        if(this.isHosting()) return;
        var binding = GameProfile.getInstance().activeTicTacToeBinding;
        
        if(binding == null) return;
        var that = this;
        this.connectingNode.active = true;
        binding.callJoin(function(err, data) {
            that.connectingNode.active = false;
            if (err) {
                that.handleError(err);                
            } else if (data.error) {
                that.handleError(data.error);
            } else {
                console.log(data);
                that.getContractState();
            }  
            
        })
    }

    onDelete(){
        if(this.isHosting()) return;
        var that = this;
        if(GameProfile.getInstance().removeChallengedAddresses(this.addressText)){
            that.node.emit('hide');
            this.hide();
        }                
    }

    onAccept(){
        if(!this.isHosting()) return;
        var binding = GameProfile.getInstance().activeTicTacToeBinding;
        
        if(binding == null) return;
        var that = this;
        this.connectingNode.active = true;
        binding.callAcceptChallenge(function(err, data) {
            that.connectingNode.active = false;
            if (err) {
                that.handleError(err);                
            } else if (data.error) {
                that.handleError(data.error);
            } else {
                console.log(data);
                that.getContractState();
            }  
        })
    }

    onChangeState(){
        if(!this.isHosting()) return;

        var binding = GameProfile.getInstance().activeTicTacToeBinding;
        if(binding.contractState == null){
            GameProfile.getInstance().userData.activeTicTacToeAddress = '';
            GameProfile.getInstance().activeTicTacToeBinding = null;
            this.node.emit('hide');
            this.hide();            
        }

        if(binding == null) return;
        var that = this;
        this.connectingNode.active = true;
        var new_state = !binding.contractState.opening;
        binding.callChangeOpenStatus(new_state, function(err, data) {
            that.connectingNode.active = false;
            if (err) {
                that.handleError(err);                
            } else if (data.error) {
                that.handleError(data.error);
            } else {
                console.log(data);
                that.getContractState();
            }              
        })
    }

    // onLoad () {}

    start () {

    }

    // update (dt) {}
}
