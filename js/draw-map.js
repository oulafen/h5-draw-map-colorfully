$(function () {
    $('.header').css({'position':'absolute',
        'min-width': '300px',
        'left': '50%',
        'transform': 'translateX(-50%)',
        '-webkit-transform': 'translateX(-50%)',
        'z-index':'999'});
    $('.content').css('height', $('.map-container').height());
    mapDraw.init();

    initDetailControl();
});

var mapDraw = {
    debug: false,
    map: '',
    maxSpeed: 0,
    minSpeed: 0,
    averageSpeed: 0,
    pointsList: [],
    kiloPoints: [], //整公里数的点
    canvas: '',
    polylineArr: [],
    mapZooms: [3, 18],
    dashedLineColor: "#999",
    bellowColors: ["#ffff00", "#fff500", "#ffe800", "#ffd900", "#ffc700", "#ffb400", "#ffa000", "#ff8a00", "#ff6000", "#ff2700", "#ff0000"],
    topColors: ["#ffff00", "#eeff00", "#d7ff00", "#bcff00", "#9fff00", "#7fff00", "#5fff00", "#41ff00", "#27ff00", "#10ff00", "#00ff00"],
    colorSteps: 10,
    speedTopStep: 0,
    speedBellowStep: 0,
    hideBuildingPointRoad: true,
    kilo_mark: $('.report-content').data('kilomark'),
    init: function () {
        mapDraw.map = new AMap.Map("map-container", {
            resizeEnable: true,
            mapStyle: 'blue_night',
            zooms: mapDraw.mapZooms
        });
        $('.map-filter').show();


        mapDraw.getList(mapDraw.processData);   //获取轨迹点, 并执行回调来处理
        mapDraw.setFeatures();
    },

    setFeatures: function(){
        if(this.hideBuildingPointRoad){
            mapDraw.map.setFeatures(['bg']);
        }
    },

    getList: function (callback) {
        var mapListUrl = $('#map-container').data('url');
        if(!mapListUrl.length){
            $('.map-filter .loading').hide();
            $('.map-filter .error-msg').html('找不到该用户的跑步数据').show();
            return;
        }
        //获取地图信息
        var hash = location.search.slice(1).split('=')[1];
        switch (hash){
            case 'parse':
                var mapData = JSON.parse(parse_data.data);
                break;
            case 'data1':
                var mapData = JSON.parse(data1.data);
                break;
            case 'data2':
                var mapData = JSON.parse(data2.data);
                break;
            case 'data3':
                var mapData = JSON.parse(data3.data);
                break;
            default :
                var mapData = JSON.parse(data1.data);
        }

        console.log('map data->',mapData);

        if(!mapData.list.length){
            $('.map-filter .loading').hide();
            $('.map-filter .error-msg').html('没有该用户的跑步数据').show();
            return;
        }
        callback(mapData);
    },

    processData: function (data) {
        mapDraw.pointsList = data.list;
        mapDraw.setMinMaxPace(data);

        //设置时长
        var time = JSON.parse(data.allTimeLong);
        var duration = formatDuration(setNum(time/1000));
        $('#duration').html(duration);

        if (mapDraw.pointsList[0]) {

            mapDraw.preProcessList();
            mapDraw.setMapPosition();

            mapDraw.pointsList.length > 2 ? mapDraw.setCustomLayer() : '';

            $('.map-filter').hide();
        }
    },

    preProcessList: function () {
        var tmpListArr = [];
        var kilo = 1;
        var sum_dis = 0;
        for (var i = 0; i < mapDraw.pointsList.length; i++) {
            var tmp = [];
            var speed = mapDraw.pointsList[i].speed;
            tmp[0] = mapDraw.pointsList[i].longitude;
            tmp[1] = mapDraw.pointsList[i].latitude;
            mapDraw.polylineArr.push(tmp);
            /** 找到最大和最小的点**/
            if (speed > -1 && speed > mapDraw.maxSpeed) {
                mapDraw.maxSpeed = speed;
            }
            if (speed > -1 && speed < mapDraw.minSpeed) {
                mapDraw.minSpeed = speed;
            }

            if(mapDraw.kilo_mark && mapDraw.pointsList[i-1] && mapDraw.pointsList[i].speed >=0){
                var lnglat = new AMap.LngLat(mapDraw.pointsList[i-1].longitude, mapDraw.pointsList[i-1].latitude);
                var pre_sum_dis = sum_dis;
                var sub_dis = lnglat.distance([tmp[0], tmp[1]]);
                sum_dis += sub_dis;

                if( kilo * 1000 > pre_sum_dis && kilo * 1000 <= sum_dis){
                    if(sub_dis > 1000){
                        kilo == 1 ? kilo-- : '';
                        var sub_kilo = parseInt(sub_dis / 1000);
                        kilo += sub_kilo;
                    }
                    mapDraw.pointsList[i].kilo = kilo;
                    mapDraw.kiloPoints.push(mapDraw.pointsList[i]);
                    kilo ++;
                    console.log('--calculate sum_dis----', sum_dis);
                }
            }
            tmpListArr.push(mapDraw.pointsList[i]);
        }
        mapDraw.pointsList = tmpListArr;
        mapDraw.setAvgSpeed();
        mapDraw.speedTopStep = (mapDraw.maxSpeed - mapDraw.averageSpeed) / mapDraw.colorSteps;
        mapDraw.speedBellowStep = (mapDraw.averageSpeed - mapDraw.minSpeed) / mapDraw.colorSteps;
    },

    setMapPosition: function () {
        /** 使用高德地图自带的覆盖方法,自动定位并缩放,但不显示 **/
        var polyline = new AMap.Polyline({
            path: mapDraw.polylineArr,
            strokeColor: "#FF33FF",
            strokeOpacity: 0,
            strokeWeight: 0,
            zIndex:0
        });
        polyline.setMap(mapDraw.map);

        mapDraw.pointsList.length > 0 ? mapDraw.setPoints() : '';

        mapDraw.map.setFitView(); //屏幕自适应
    },

    drawLine: function () {
        var startColor = '';
        var endColor = '';
        var context = mapDraw.canvas.getContext('2d');
        var parsePointsArr = [];
        var parseNum = 0;
        mapDraw.canvas.width = mapDraw.map.getSize().width;
        mapDraw.canvas.height = mapDraw.map.getSize().height;
        context.globalAlpha=1;
        context.clearRect(0, 0, mapDraw.canvas.width, mapDraw.canvas.height);
        context.lineWidth = 3;
        context.lineCap = 'round';

        mapDraw.pointsList[0].containerPos = mapDraw.map.lngLatToContainer([mapDraw.pointsList[0].longitude, mapDraw.pointsList[0].latitude]);
        for (var j = 1, pointLen = mapDraw.pointsList.length; j < pointLen; j++) {
            if (mapDraw.pointsList[j].speed < 0) { /** 暂停点 **/
                if( j == 1 && mapDraw.pointsList[0].speed < 0){
                    /** 第一个点是暂停点 **/
                    parsePointsArr[parseNum] = [];
                    parsePointsArr[parseNum].push([mapDraw.pointsList[0].longitude, mapDraw.pointsList[0].latitude]);
                }
                if ( mapDraw.pointsList[j - 1] && mapDraw.pointsList[j - 1].speed >= 0) {
                    /** 上一个点非暂停, 当前点暂停, 则开始记录新的暂停数组 **/
                    parseNum += 1;
                    parsePointsArr[parseNum] = [];
                    parsePointsArr[parseNum].push([mapDraw.pointsList[j - 1].longitude, mapDraw.pointsList[j - 1].latitude]);
                }
                parsePointsArr[parseNum].push([mapDraw.pointsList[j].longitude, mapDraw.pointsList[j].latitude]);
            }
            if(mapDraw.pointsList[j].speed >= 0){ /** 非暂停点 **/
                if(mapDraw.pointsList[j-1].speed < 0){
                    mapDraw.pointsList[j-1].containerPos = mapDraw.map.lngLatToContainer([mapDraw.pointsList[j-1].longitude, mapDraw.pointsList[j-1].latitude]);
                }
                mapDraw.pointsList[j].containerPos = mapDraw.map.lngLatToContainer([mapDraw.pointsList[j].longitude, mapDraw.pointsList[j].latitude]);
                var startX = mapDraw.pointsList[j - 1].containerPos.x;
                var startY = mapDraw.pointsList[j - 1].containerPos.y;
                var endX = mapDraw.pointsList[j].containerPos.x;
                var endY = mapDraw.pointsList[j].containerPos.y;
                startColor = mapDraw.getColor(mapDraw.pointsList[j-1].speed);
                endColor = mapDraw.getColor(mapDraw.pointsList[j].speed);
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                //设置渐变
                var grd = context.createLinearGradient(startX, startY, endX, endY);
                grd.addColorStop(0, startColor);
                grd.addColorStop(1, endColor);
                context.strokeStyle = grd;
                context.stroke();
            }
        }

        //找到暂停点后绘制虚线
        mapDraw.drawDashedLine(parsePointsArr);
    },

    drawDashedLine: function(parsePointsArr){
        for (var i = 0; i < parsePointsArr.length; i++) {
            var line = new AMap.Polyline({
                path: parsePointsArr[i],
                strokeColor: mapDraw.dashedLineColor,
                strokeOpacity: 1,
                strokeWeight: 3,
                strokeStyle: 'dashed',
                strokeDasharray: [5, 5],
                zIndex: 1
            });
            line.setMap(mapDraw.map);
        }
    },

    setCustomLayer: function () {
        mapDraw.map.plugin(['AMap.CustomLayer'], function () {

            mapDraw.canvas = document.createElement('canvas');
            var customLayer = new AMap.CustomLayer(mapDraw.canvas, {
                zIndex: 99,
                zooms: mapDraw.mapZooms
            });

            customLayer.setMap(mapDraw.map);
            customLayer.render = mapDraw.drawLine;
        });
    },

    getColor: function (speed) {
        if(speed < 0 ){
            return '#ffff00';
        }
        var subSpeed = speed - mapDraw.averageSpeed;
        if (subSpeed > 0) {
            var level = parseInt(subSpeed / mapDraw.speedTopStep);
            return mapDraw.topColors[level];
        } else {
            var level = parseInt(Math.abs(subSpeed) / mapDraw.speedBellowStep);
            return mapDraw.bellowColors[level];
        }
    },

    setPoints: function () {
        mapDraw.makers = [];
        if(mapDraw.kilo_mark){
            //添加整公里数
            for(var i=0; i<mapDraw.kiloPoints.length; i++){
                var point = mapDraw.kiloPoints[i];
                var maker = new AMap.Marker({
                    map: mapDraw.map,
                    position: [point.longitude, point.latitude],
                    content: '<div class="kilo-point"><p>'+  point.kilo + '</p></div>',
                    offset: new AMap.Pixel(-8, -8)
                });
                mapDraw.makers.push(maker);
            }
        }

        var markersArg = [{
            icon: 'images/point-start.png',
            position: [mapDraw.pointsList[0].longitude, mapDraw.pointsList[0].latitude]
        }, {
            icon: 'images/point-end.png',
            position: [mapDraw.pointsList[mapDraw.pointsList.length-1].longitude, mapDraw.pointsList[mapDraw.pointsList.length-1].latitude]
        }];
        mapDraw.makers = [];
        markersArg.forEach(function(marker) {
            var maker = new AMap.Marker({
                map: mapDraw.map,
                position: [marker.position[0], marker.position[1]],
                icon: new AMap.Icon({
                    size: new AMap.Size(16, 16),  //图标大小
                    image: marker.icon,
                    imageSize: new AMap.Size(16,16)
                }),
                offset: new AMap.Pixel(-8, -8)
            });
            mapDraw.makers.push(maker);
        });

        ///**删除标注点的方法**/
        //mapDraw.map.remove(mapDraw.makers);

        ///**添加标注点的方法**/
        //mapDraw.map.add(mapDraw.makers);

    },
    speedToPace: function(speed){
        if( isNaN(parseInt(speed)) || speed == 0){
            return "-";
        }
        var time = 1 / (parseFloat(speed) / 1000);
        var min = parseInt(time / 60);
        var s = parseInt(time - min * 60);
        var str = '';
        min.toString().length == 1 ? str += '0' : '';
        str += min;
        str += "'";
        s.toString().length == 1 ? str += '0' : '';
        str += s;
        str += "''";
        return str;
    },
    setAvgSpeed: function(){
        var speed = $('#avgSpeed').data('speed');
        if(speed > mapDraw.minSpeed && speed < mapDraw.maxSpeed){
            mapDraw.averageSpeed = speed;
        }else{
            /** 如果后台数据中的平均速度不正常,则为根据距离时间计算的值 **/
            mapDraw.averageSpeed = parseFloat($('#avgSpeed').data('avgspeed'));
        }
    },
    setMinMaxPace: function(data){
        var dis = data.dis;
        var minPace = dis < 1000 ? '-' : mapDraw.speedToPace(data.minSpeed);
        var maxPace = dis < 1000 ? '-' : mapDraw.speedToPace(data.maxSpeed);
        $('#minSpeed').html(minPace);
        $('#maxSpeed').html(maxPace);
    }
};

function initDetailControl(){
    setDetailStatus();

    $('.detail-control').click(function(){
        var detailBoxObj =  $(this).parent();
        var isFold = detailBoxObj.hasClass('height-hidden');
        if(isFold){
            detailBoxObj.removeClass('height-hidden');
        }else{
            detailBoxObj.addClass('height-hidden');
        }
    });

    $(window).resize(function(){
        setDetailStatus();
    });
}

function setDetailStatus() {
    var winWidth = $('.map-container').width();
    var winHeight = $('.map-container').height();
    $('.content').css('height', winHeight);
    if (winWidth > winHeight) {
        /** 横屏状态 **/
        $('.report-content .info-box').addClass('landscape');
        $('.detail-box').addClass('control height-hidden');
    } else {
        /** 竖屏状态 **/
        $('.report-content .info-box').removeClass('landscape');
        $('.detail-box').removeClass('control height-hidden');
    }

}

function formatDuration(time) {
    var seconds = parseInt(time);
    var h = parseInt(seconds / 3600);
    var min = parseInt((seconds - h * 3600) / 60);
    var s = parseInt(seconds - h * 3600 - min * 60);
    var string = '';
    h.toString().length == 1 ? string += '0' : '';
    string += h.toString();
    string += ':';
    min.toString().length == 1 ? string += '0' : '';
    string += min.toString();
    string += ':';
    s.toString().length == 1 ? string += '0' : '';
    string += s.toString();
    return string;
}

function setNum(num) {
    if (isNaN(parseInt(num))) {
        return 0;
    } else {
        return num;
    }
}