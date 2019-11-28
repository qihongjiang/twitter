var origBoard;
const human = 'O';
const computer = 'X';
const winCombos=[[0,1,2],[3,4,5],[6,7,8],
                 [0,3,6],[1,4,7],[2,5,8],
                 [0,4,8],[6,4,2]]
const cells = document.querySelectorAll('.cell');

startGame();

function startGame(){
        origBoard=Array.from(Array(9).keys());
        for(var i = 0; i < cells.length; i++){
                cells[i].innerText='';
                cells[i].style.removeProperty('background-color');
                cells[i].addEventListener('click', turnClick, false);
        }
}

function turnClick(square){
        if(typeof origBoard[square.target.id]=='number'){
                turn(square.target.id, human);
                var obj = {};
                for(var i=0; i < cells.length; i++){
                        obj[i]=cells[i].innerText;
                }
                var xhttp = new XMLHttpRequest();
                xhttp.open("POST","/ttt/play",true);
                xhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");
                xhttp.send(JSON.stringify(obj));
                if(!checkTie()) turn(bestSpot(), computer);
        }
}

function turn(id, player){
        origBoard[id]=player;
        document.getElementById(id).innerText = player;
        let won = check(origBoard, player);
        if(won) gameOver(won)
}

function check(board, player){
        let plays = board.reduce((a,e,i)=>(e===player)?a.concat(i):a,[]);
        let won = null;
        for(let [index,win] of winCombos.entries()){
                if(win.every(elem=>plays.indexOf(elem)>-1)){
                        won={index:index, player:player};
                        break;
                }
        }
        return won;
}

function gameOver(won){
        for(let index of winCombos[won.index]){
                document.getElementById(index).style.backgroundColor="blue";
        }
        for(var i = 0; i < cells.length; i++){
                cells[i].removeEventListener('click', turnClick, false);
        }
}

function bestSpot(){
        return emptySquares()[0];
}

function emptySquares(){
        return origBoard.filter(s=>typeof s=='number');
}

function checkTie(){
        if(emptySquares().length==0){
                for(var i = 0; i < cells.length; i++){
                        cells[i].style.backgroundColor="green";
                        cells[i].removeEventListener('click', turnClick, false);
                }
                return true;
        };
}
