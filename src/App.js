import './App.css';
import React, { Component } from 'react'
let canvBoderWidth = 2;
let currNode = {};              // текущий обрабатываемый узел
let currLine = {};              // текущая линия
let canMoveNode = false;        // разрешение на перемещение узлов
let canBreak = false;
let indexNode0 = 0;             // индекс начального узла
let currIndexNode;
let moveObj = 0;                // когда 1 - был узловый клик, 2 - по стророне объекта
let currPointForMove = [];      // текущая нажатая точка для перемещения объекта
let removeNode = false;         // разрешение на удаление узла
let nodesObj = [[]];
let linesObj = [[]];
let iter = 0;
let indexAddLine = 0;
let indexAddObj = 0;
let point = [], point2 = [], point3 = [], point4 = [];
let canFill = false;
let colorsObj = [];

function Node(x, y, width, height, color = 'red', lineFrom, lineTo) {     // класс "Узел"
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.lineFrom = lineFrom;
    this.lineTo = lineTo;
    this.color = color;
    this.draw = function (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}

function Line(begX, begY, endX, endY, width = 1, color = 'blue') {     // класс "Линия"
    this.begX = begX;
    this.begY = begY;
    this.endX = endX;
    this.endY = endY;
    this.width = width;
    this.color = color;
    this.draw = function (ctx) {
        ctx.beginPath();
        ctx.lineWidth = this.width; // толщина линии
        ctx.moveTo(this.begX, this.begY);
        ctx.lineTo(this.endX, this.endY);
        ctx.strokeStyle = this.color;   
        ctx.stroke();
        ctx.closePath();
    }
}

export default class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            firstDraw: true,       // разрешение на начальные изменения
            edit: false,           // режим редактирования
            nodes: [],             // массив узлов
            lines: [],             // массив линий
        };
        this.canvas = React.createRef();
        this.ctx = React.createRef();
        this.onMouseClick = this.onMouseClick.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.createLines = this.createLines.bind(this);
        this.startChanges = this.startChanges.bind(this);
        this.doubleClick = this.doubleClick.bind(this);
    }

    componentDidMount() {
        const canvas = this.canvas.current;
        canvas.width = window.innerWidth - 20;
        canvas.height = window.innerHeight - 20;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'blue';
        ctx.lineWifth = 3;
        this.ctx.current = ctx;
        canvas.style.cursor = 'pointer';

        document.onmousemove = this.onMouseMove;
    }

    doubleClick(event){
        event.preventDefault();
        
        // Разрешение на добавление узла
        const [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];
        const step = 1000;
        let x0, xk, y0, yk, dx, dy, iterX, iterY;
        let lines = this.state.lines;
            lines.forEach(line => {
                x0 = line.begX;
                y0 = line.begY;
                xk = line.endX;
                yk = line.endY;
                dx = xk - x0;
                dy = yk - y0;
                iterX = dx/step;
                iterY = dy/step;
                for (let i = 0; i < step; i++)
                    if ((x < x0 + iterX * i + 3 && x > x0 + iterX * i - 3) && (y < y0 + iterY * i + 3 && y > y0 + iterY * i - 3)){
                        canBreak = true;  
                        return;
                    }
        });

        // Разрешение на удаление узла
        this.state.nodes.forEach((node, index) => {
            if (x < node.x + 6 && x > node.x - 6 && y > node.y - 6 && y < node.y + 6) {
                currNode = node;
                currIndexNode = index;
                removeNode = true;
                return;
            }
        });

    }
    onMouseUp(){
        moveObj = 0;        // запрет на перемещения
        canMoveNode = false;
    }
    onMouseClick(event) {

        if (event.buttons !== 1) return;            //выполнение кода ниже только при ЛКМ

        if (this.state.edit) {                       // выполняется при включенном режиме редактирования
            this.editCanvas(event);
            return;
        }

        const [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];

        if (!this.state.firstDraw) {                                //соединение последнего узла с первым
            const node0 = this.state.nodes[indexNode0];
            if (x < node0.x + 6 && x > node0.x - 6 && y > node0.y - 6 && y < node0.y + 6) {
                this.endCreateLine(node0.x, node0.y);
                canFill = true;
                this.redrawing();

                node0.width = 6;
                node0.height = 6;
                node0.lineTo = currLine;

                iter++;
                nodesObj.push([]);
                linesObj.push([]);
                currNode = {};
                currLine = {};

                this.setState({
                    firstDraw: true
                });
                
                this.drawText();
                return;
            }
        }

        let node;
        node = new Node(x, y, 6, 6, 'red');             // создание нового узла
        if (Object.keys(currNode).length !== 0) node.lineTo = currLine;      // линия, входящая в узел (currLine)
        currNode = node;                                    // текущий узел
        nodesObj[iter].push(node);
        
        if (this.state.firstDraw) {                         // обработка первого узла
            this.beginCreateLine();
            this.setState({
                firstDraw: false,
            });
            indexNode0 = this.state.nodes.length;           // индекс начального узла
        }
        else {
            this.createLines(event);
        }

        node.draw(this.ctx.current);                        // вывод узла на экран
        this.state.nodes.push(node);                        // добавление узла в массив состояний
        
    }

    /* Функция создания линий */
    createLines(event) {
        const [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];
        this.endCreateLine(x, y);
        this.beginCreateLine();
    }

    /* Функция создания линии, присвоение нач. координат и добавление в состояние */
    beginCreateLine() {
        let line = new Line(currNode.x, currNode.y);
        linesObj[iter].push(line);
        this.state.lines.push(line);

        currNode.lineFrom = line;       // линия, выходящая из узла
        currLine = line;
    }

    /* Функция присвоения конечных координат линии и вывод */
    endCreateLine(x, y) {
        let ctx = this.ctx.current;
        currLine.endX = x;
        currLine.endY = y;
        currLine.draw(ctx);
        this.state.nodes.forEach(node => node.draw(ctx));
    }

    /* Функция перерисовки узлов и линий*/
    redrawing() {
        let ctx = this.ctx.current;
        ctx.clearRect(0, 0, this.canvas.current.width, this.canvas.current.height);
        this.fillObj();
        this.state.lines.forEach(line => line.draw(ctx));
        this.state.nodes.forEach(node => node.draw(ctx));
    }
    // Закрашивание области
    fillObj(){  
        const ctx = this.ctx.current;

        linesObj.forEach((lines) => {
            if (!lines.length) return;
            let lineEnd = lines[lines.length - 1];
            if (lines[0].begX === lineEnd.endX && lines[0].begY === lineEnd.endY){
                ctx.beginPath();
                ctx.moveTo(lines[0].begX, lines[0].begY);
                lines.forEach(line => {
                    ctx.lineTo(line.endX, line.endY); 
                })

                let index = linesObj.indexOf(lines);

                let color = {
                    red: this.getRandoms(),
                    green: this.getRandoms(),
                    blue: this.getRandoms()
                }
                if (!colorsObj[index]) colorsObj.push(color);

                console.log(color);
                ctx.fillStyle = `rgb(${colorsObj[index].red}, ${colorsObj[index].green}, ${colorsObj[index].blue})`;
                //ctx.fillStyle = `#EEE8AA`;
                ctx.fill();
            }
        });
    }

    getRandoms(){
        return Math.floor(Math.random() * Math.floor(255));
    }

    onMouseMove(event) {

        /******-----Участок кода отвечает за анимацию узлов при наведении----*********/
        let [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];
        let nodes = this.state.nodes;
        nodes.forEach(node => {
            if (x < node.x + 6 && x > node.x - 6 && y > node.y - 6 && y < node.y + 6) {
                node.width = 12;
                node.height = 12;
            }
            else {
                this.ctx.current.clearRect(node.x - node.width / 2, node.y - node.height / 2, node.width, node.height);
                node.width = 6;
                node.height = 6;
            }
        });
        this.redrawing();       //перерисовка
        /***********------------------Конец анимации----------------------************/

        /***********-------Участок кода для режима "редактирование"------*************/
        if (this.state.edit) {
            
            // Код ниже реализует добавление узла в произвольной точке линии
            const step = 1000;
            let x0, xk, y0, yk, dx, dy, iterX, iterY;
            let lines = this.state.lines;
            lines.forEach(line => {
                x0 = line.begX;
                y0 = line.begY;
                xk = line.endX;
                yk = line.endY;
                dx = xk - x0;
                dy = yk - y0;
                iterX = dx/step;
                iterY = dy/step;

                for (let i = 0; i < step; i++){
                    if ((Math.abs(x - line.begX) < 10 && Math.abs(y - line.begY) < 10) || (Math.abs(x - line.endX) < 10 && Math.abs(y - line.endY) < 10)) {
                        canBreak = false;
                        return;
                    }
                    if ((x < x0 + iterX * i + 3 && x > x0 + iterX * i - 3) && (y < y0 + iterY * i + 3 && y > y0 + iterY * i - 3)){

                        x = x0 + iterX * i; 
                        y = y0 + iterY * i;
                        line.color = 'green';
                        line.width = 3;
                        line.draw(this.ctx.current);
                        line.color = 'blue';
                        line.width = 1;
                        
                        // разбитие линии на 2 части
                        if (canBreak){  //разрешение на разбивку

                            let nodes = this.state.nodes;
                            let index1Node = nodes.findIndex(node => node.x === line.begX && node.y === line.begY );
                            let index2Node = nodes.findIndex(node => node.x === line.endX && node.y === line.endY );

                            line.endX = x;
                            line.endY = y;
                            let line2 = new Line(x, y, nodes[index2Node].x, nodes[index2Node].y);
                            let indexLine = lines.indexOf(line);
                            lines.splice(indexLine + 1, 0, line2);

                            let node = new Node(x, y, 6, 6);
                            node.lineFrom = line2;
                            node.lineTo = line;
                            nodes.splice(index1Node + 1, 0, node);

                            
                            // добавление узла в глобальную переменную 
                            let indexAdd = 0;
                            nodesObj.forEach((mas, i) => {
                                let index = mas.findIndex(node => node === nodes[index1Node]);
                                if (index >= 0) {
                                    indexAdd = index;
                                    indexAddObj = i;
                                }
                            });
                            nodesObj[indexAddObj].splice(indexAdd + 1, 0, node);
                            ////

                            // добавление линии в глобальную переменную
                            indexAdd = 0;
                            linesObj.forEach((mas, i) => {
                                let index = mas.findIndex(line => line === lines[index1Node]);
                                if (index >= 0) {
                                    indexAdd = index;
                                    indexAddLine = i;
                                }
                            });
                            linesObj[indexAddLine].splice(indexAdd + 1, 0, line2);

                            if (index2Node < index1Node){
                                nodes[index2Node].lineTo = line2;
                            }   
                            else nodes[index2Node + 1].lineTo = line2;

                            this.setState({
                                lines: lines,
                                nodes: nodes,
                                lastNode: node
                            });

                        }
                        canBreak = false;
                        return;  
                    }
                }
            });

            // перемещение объекта
            if (moveObj){
                let [x, y] = [event.pageX - canvBoderWidth, event.pageY - canvBoderWidth];
                let crashLeft = false, crashRight = false, crashTop = false, crashBot = false;
                
                let dx;
                let dy;
                dx = x - currPointForMove[0];
                dy = y - currPointForMove[1];

                let crashNode;
                this.state.nodes.forEach((node) => {
                    if (node.x + dx < 5) {
                        crashNode = node; crashLeft = true;
                        if (point.length == 0) point = currPointForMove; 
                    }
                    if (node.x + dx > this.canvas.current.width) {
                        crashNode = node; crashRight = true;
                        if (point2.length == 0) point2 = currPointForMove;
                    }
                    if (node.y + dy < 5) {
                        crashNode = node; crashTop = true;
                        if (point3.length == 0) point3 = currPointForMove;
                    }
                    if (node.y + dy> this.canvas.current.height) {
                        crashNode = node; crashBot = true;
                        if (point4.length == 0) point4 = currPointForMove;
                    }
                });
                
                // поиск объекта из глобального массива
                nodesObj.forEach((mas, i) => {
                    let index = mas.findIndex(node => node === currNode);
                    if (index >= 0) {
                        indexAddObj = i;
                    }
                });

                linesObj.forEach((mas, i) => {
                    let index = mas.findIndex(line => line === currLine);
                    if (index >= 0) {
                        indexAddLine = i;
                    }
                });

                if (crashLeft && dx < 0 || crashRight && dx > 0) dx = 0;
                if (crashTop && dy < 0 || crashBot && dy > 0) dy = 0;
                
                if (x < point[0]) dx = 0; else point = [];
                if (x > point2[0]) dx = 0; else point2 = [];
                if (y < point3[1]) dy = 0; else point3 = [];
                if (y > point4[1]) dy = 0; else point4 = [];

                nodes = nodesObj[indexAddLine];
                lines = linesObj[indexAddLine];
                currPointForMove = [x, y];
                
                nodes.forEach(node => {
                    node.x += dx;
                    node.y += dy;
                });
                lines.forEach(line => {
                    line.begX += dx;
                    line.begY += dy;
                    line.endX += dx;
                    line.endY += dy;
                });    
                canMoveNode = false;
                this.redrawing();
            }
            
            //перемещение узла 
            if (canMoveNode) {
                let [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];
                if (x < 0) x = 3;
                if (x > this.canvas.current.width) x = this.canvas.current.width;
                if (y < 0) y = 3;
                if (y > this.canvas.current.height) y = this.canvas.current.height;

                currNode.x = x;
                currNode.y = y;

                const node = this.state.nodes[currIndexNode];
                node.lineFrom.begY = y;
                node.lineFrom.begX = x;

                if (this.state.nodes[currIndexNode].lineTo) {
                    if (node.lineTo.endY) {
                        node.lineTo.endX = x;
                        node.lineTo.endY = y;
                    }
                }
                this.redrawing();
            }

            // удаление узла
            if (removeNode){
                // Находим индекс объекта и элемента в этом объекте
                let indObj, indLine, currObjNode, currObjLine;
                nodesObj.forEach((mas, i) => {
                    let index = mas.findIndex(node => node === currNode);
                    if (index >= 0) { 
                        indObj = i;                     // индекс объекта   
                        indLine = index;                // индекс линии в данном объекте
                        return;
                    }
                });

                currObjNode = nodesObj[indObj];
                currObjLine = linesObj[indObj];

                let nextNode = indLine === currObjNode.length - 1 ? currObjNode[0] : currObjNode[indLine + 1];
                let prevLine = indLine === 0 ? currObjLine[currObjLine.length - 1] : currObjLine[indLine - 1];

                let i = currObjLine.indexOf(prevLine);
                
                currObjLine[i].endX = nextNode.x;
                currObjLine[i].endY = nextNode.y;
                nextNode.lineTo = currObjLine[i];
                
                // удаление линии из базы
                currObjLine.splice(indLine, 1);
                let ind = this.state.nodes.indexOf(currNode);   // индекс узла-линии в массиве состояний 
                this.state.lines.splice(ind, 1);

                // удаление узла из базы
                currObjNode.splice(indLine, 1);
                this.state.nodes.splice(ind, 1);
            
            }
            removeNode = false;
        }
        this.drawText();
        /**************----------Конец режима "редактирование"----------***************/

    }

    /* Функция вызывается при клике на ПКМ. Переключение в режим редактирования/рисования*/
    startChanges(event) {
        event.preventDefault();
        this.setState({
            firstDraw: true,
            edit: !this.state.edit
        });
        canFill = true;
        // дорисовка линии
        if (currLine && !this.state.firstDraw){
            const node0 = this.state.nodes[indexNode0];
            this.endCreateLine(node0.x, node0.y);
            this.redrawing();
            node0.width = 6;
            node0.height = 6;
            node0.lineTo = currLine;
            iter++;
            nodesObj.push([]);
            linesObj.push([]);
            this.drawText();
            return;
        }
        currNode = {};
        currLine = {};
    }

    /* Функция вызывается при включении режима редактирования*/
    editCanvas(event) {
        const [x, y] = [event.clientX - canvBoderWidth, event.clientY - canvBoderWidth];
        
        this.state.nodes.forEach((node, index) => {
            if (x < node.x + 6 && x > node.x - 6 && y > node.y - 6 && y < node.y + 6) {
                canMoveNode = true;
                currNode = node;
                currIndexNode = index;
                return;
            }
        });
        if (canMoveNode) return;


        const step = 1000;
        let x0, xk, y0, yk, dx, dy, iterX, iterY;
        let lines = this.state.lines;
            lines.forEach(line => {
                x0 = line.begX;
                y0 = line.begY;
                xk = line.endX;
                yk = line.endY;
                dx = xk - x0;
                dy = yk - y0;
                iterX = dx/step;
                iterY = dy/step;
                for (let i = 0; i < step; i++){
                    if ((Math.abs(x - line.begX) < 10 && Math.abs(y - line.begY) < 10) || (Math.abs(x - line.endX) < 10 && Math.abs(y - line.endY) < 10)) {
                        continue;
                    }
                    if ((x < x0 + iterX * i + 3 && x > x0 + iterX * i - 3) && (y < y0 + iterY * i + 3 && y > y0 + iterY * i - 3)){
                        moveObj = true;
                        currLine = line;
                        currPointForMove = [x0 + iterX * i, y0 + iterY * i];
                        return;
                    }  
                }
        });

        if (!moveObj){
            let imgData = this.ctx.current.getImageData(x, y, 1, 1);
            //if (imgData.data[0] > 0){
                
                let red = imgData.data[0];
                let green = imgData.data[1];
                let blue = imgData.data[2];
                
                colorsObj.forEach(obj => {
                    if (obj.red === red && obj.green === green && obj.blue === blue){
                        let index = colorsObj.indexOf(obj);
                        moveObj = true;
                        currLine = linesObj[index][0];
                        currPointForMove = [x, y];
                        return;
                    }
                });
        }
    }

    //  вывод текста
    drawText() {
        const ctx = this.ctx.current;
        ctx.font = "30px Verdana";
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;
        if (this.state.edit) {
            this.canvas.current.style.cursor = 'crosshair';
            ctx.strokeText("Режим редактирования", 20, 40);
        }
        else {
            this.canvas.current.style.cursor = 'pointer';
            ctx.strokeText("Режим рисования", 20, 40);
        }
        ctx.strokeStyle = "black";
        ctx.font = "12px Verdana";
        ctx.strokeText("Инструкция: ", 20, 80);
        ctx.strokeText("1) Смена режима: ПКМ", 20, 100);
        ctx.strokeText("2) Удерживание ЛКМ - перемещение объекта", 20, 120);
        ctx.strokeText("3) Двойной клик - удаление/ добавление узла", 20, 140);
        ctx.font = "14px Verdana";
        ctx.strokeText("* Рисуйте узлы через клики", 20, window.innerHeight - 25);
        ctx.strokeStyle = "blue";
    }

    render() {
        return (
            <canvas
                ref={this.canvas}
                onMouseDown={this.onMouseClick}
                onMouseUp={this.onMouseUp}
                onContextMenu={this.startChanges}
                onDoubleClick={this.doubleClick}
            />
        )
    }
}

