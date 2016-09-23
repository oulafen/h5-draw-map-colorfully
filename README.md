# 使用高德地图绘制彩色路线
应产品需求, 将跑者的轨迹数据根据不同的配速画轨迹.

# 原理
本次用的方法比较笨, 主要是高德自带的API + H5的canvas.
## 轨迹的绘制
### 定位和自适应屏幕
- 高德自己有绘制轨迹的方法, 虽然只能是单色的, 但可以用它来进行定位和自适应屏幕
```js
/** 使用高德地图自带的覆盖方法, 自动定位并缩放, 但不显示 **/
var polyline = new AMap.Polyline({
    path: mapDraw.polylineArr,
    strokeColor: "#FF33FF",
    strokeOpacity: 0,
    strokeWeight: 0,
    zIndex:0
 });
 polyline.setMap(mapDraw.map);
 mapDraw.map.setFitView(); //屏幕自适应
 ```
### 不同颜色的轨迹
 - 使用canvas
 - 因为轨迹是由点组成的, 每两点之间连起来, 整体的线也就连起来了, 故思路来了, 绘制的时候, 遍历所有的点, 并在相邻的两个点之间绘一条直线
 - 对于不同的颜色, 则判断下速度, 根据速度值来设置颜色
```js
// 遍历所有的点
for (var j = 1, pointLen = mapDraw.pointsList.length; j < pointLen; j++) { 
     mapDraw.pointsList[j].containerPos = mapDraw.map.lngLatToContainer([mapDraw.pointsList[j].longitude, mapDraw.pointsList[j].latitude]);
     var startX = mapDraw.pointsList[j - 1].containerPos.x;  //开始点的x坐标
     var startY = mapDraw.pointsList[j - 1].containerPos.y;  //开始点的y坐标
     var endX = mapDraw.pointsList[j].containerPos.x;   //结束点的x坐标
     var endY = mapDraw.pointsList[j].containerPos.y;   //结束点的y坐标
     context.beginPath();
     context.moveTo(startX, startY);
     context.lineTo(endX, endY);
     context.strokeStyle = mapDraw.getColor(mapDraw.pointsList[j].speed); //根据速度来获取颜色
     context.stroke();
}     
```
### 暂停点的轨迹
 - 暂停点用虚线, 尝试过使用canvas来实现, 但不尽人意, 所以结合高德地图的api来实现, 而且自带了内部优化, 何乐而不为呢
 - 首先要知道每一段轨迹中可能有N段暂停, canvas里没有直接画虚线的方法,而在高德地图里有这样的api,什么也不说了,肯定用现成的啊
```js
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
```
### 优化
- 利用canvas里的渐变色, 可以使两个线段之间的过渡不那么生硬

看对比图
<img src="http://statics.oulafen.com/github-grd.jpg" style="width:100%;">

(⊙o⊙)…感觉眼要瞎了
```js
//设置渐变
startColor = mapDraw.getColor(mapDraw.pointsList[j-1].speed);
endColor = mapDraw.getColor(mapDraw.pointsList[j].speed);
var grd = context.createLinearGradient(startX, startY, endX, endY);
grd.addColorStop(0, startColor);
grd.addColorStop(1, endColor);
context.strokeStyle = grd;
```

# 预览
- [正常轨迹10km预览](http://blog.oulafen.com/draw_map_colorfully/index.html?data=data1)
- [正常轨迹5km预览](http://blog.oulafen.com/draw_map_colorfully/index.html?data=data2)
- [正常轨迹5.4km预览](http://blog.oulafen.com/draw_map_colorfully/index.html?data=data3)
- [有暂停的轨迹预览](http://blog.oulafen.com/draw_map_colorfully/index.html?data=parse)

