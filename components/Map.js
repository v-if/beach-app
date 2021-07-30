import React, { Component } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import Colors from './Colors';
import PropTypes from 'prop-types';
import {BannerAd, BannerAdSize, TestIds} from '@react-native-firebase/admob';

const { width, height } = Dimensions.get('window');

import { getDistance } from 'geolib';

const ASPECT_RATIO = width / height;
const LATITUDE = 35.9204073;
const LONGITUDE = 127.6782706;
const LATITUDE_DELTA = 5.2;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const _ = require('lodash')
const storageData = require('./data.json');

class BeachMarker extends React.Component {

  render() {
    const { beach } = this.props;
    return (
      <View
        style={styles.marker}
      >
        <Text style={styles.markerFont}>{beach.beachName}</Text>
        <Text style={beach.congestion == 1 ? {color: Colors.green, fontSize: 14} : {color: Colors.black, fontSize: 14}}>●</Text>
        <Text style={beach.congestion == 2 ? {color: Colors.yellow, fontSize: 14} : {color: Colors.black, fontSize: 14}}>●</Text>
        <Text style={beach.congestion == 3 ? {color: Colors.red, fontSize: 14} : {color: Colors.black, fontSize: 14}}>●</Text>
      </View>
    );
  }
}

BeachMarker.propTypes = {
  beach: PropTypes.object,
};

class BeachCallout extends React.Component {

  render() {
    const { beach } = this.props;
    return (
      <Callout
        style={styles.callout}
      >
        <View>
          <Text style={styles.calloutText}>해수욕장명 : {beach.beachName}</Text>
          <Text style={styles.calloutText}>{beach.areaName + ' ' + beach.areaName2}</Text>
          <Text style={styles.calloutText}>혼잡도 : {beach.congestion == 1 ? '양호, 거리두기(2m)가능' : beach.congestion == 2 ? '방문주의' : '거리두기(2m)불가, 방문자제'}</Text>
          <Text style={styles.calloutText}>개장일[7/1] - 폐장일[8/31]</Text>
          <Text style={styles.calloutText}>Update : {beach.etlDt.substring(0, 4) + '-' + beach.etlDt.substring(4, 6) + '-' + beach.etlDt.substring(6, 8) + ' ' + beach.etlDt.substring(8, 10) + ':' + beach.etlDt.substring(10, 12)}</Text>
        </View>
      </Callout>
    );
  }
}

BeachCallout.propTypes = {
  beach: PropTypes.object,
};

class Map extends Component {
  constructor(props) {
    super(props);

    this.state = {
      region: {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      markers: [],
      mergeData: [],
      zoomLevel: 1,
      isPopup: true,
    };
  }

  showMarkerFilterZoomGroup(zoomLevel, latitude, longitude) {
    //console.log(`showMarkerFilterZoomGroup zoomLevel:${zoomLevel} latitude:${latitude} longitude:${longitude}`)

    // 지도 확대레벨에 따라 zoomGroup에 해당하는 해변만 나오도록
    let zoomGroupFilter = this.state.mergeData.filter(function (data, index) {
      //console.log(`${index} ${data.seqId} ${data.zoomGroup}`)
      let distance = getDistance(
        { latitude: data.latitude, longitude: data.longitude },
        { latitude: latitude, longitude: longitude }
      ) / 1000;
      //console.log(`distance:${distance}`)

      let cutDistance
      if(zoomLevel == 1) {
        cutDistance = 600 // 600km
      } else if(zoomLevel == 2) {
        cutDistance = 100 // 100km
      } else if(zoomLevel == 3) {
        cutDistance = 80 // 80km
      } else if(zoomLevel == 4) {
        cutDistance = 50 // 50km
      }
      if(data.zoomGroup <= zoomLevel && distance < cutDistance) {
        //console.log(`distance:${distance}km ${data.beachName}`)
      }

      return data.zoomGroup <= zoomLevel && distance < cutDistance
    })
    this.setState({markers: zoomGroupFilter})

  }

  onRegionChangeComplete = (region) => {
    if(this.state.markers.length == 0) {
      return;
    }

    let level = parseInt(Math.log2(360 * (width / 256 / region.longitudeDelta)) + 1)
    //console.log(`onRegionChangeComplete lat:${region.latitude}, lon:${region.longitude}, level:${level}`)

    let zoomLevel = 1
    if(level < 9) {
      zoomLevel = 1
    } else if(level < 10) {
      zoomLevel = 2
    } else if(level < 11) {
      zoomLevel = 3
    } else {
      zoomLevel = 4
    }

    // 이전 zoomLevel 과 비교하여 변경되었으면 showMarkerFilterZoomGroup 호출
    if(this.state.zoomLevel != zoomLevel) {
      this.setState({zoomLevel: zoomLevel})
      this.showMarkerFilterZoomGroup(zoomLevel, region.latitude, region.longitude)
    }
  }

  requestApi() {
    let url = 'https://www.tournmaster.com/seantour_map/travel/getBeachCongestionApi.do'
    fetch(url)
      .then((response) => response.json())
      .then((json) => {
        //console.log(json)
        let resData = []
        Object.keys(json).forEach(function(key) {
          //console.log('Key : ' + key + ', Value : ' + beach[key])

          let etlDt = ''
          let seqId = ''
          let congestion = ''
          Object.keys(json[key]).forEach(function(subkey) {
            //console.log('Key : ' + subkey + ', Value : ' + beach[key][subkey])
            if(subkey == 'etlDt') {
              etlDt = json[key][subkey]
            } else if(subkey == 'seqId') {
              seqId = json[key][subkey]
            } else if(subkey == 'congestion') {
              congestion = json[key][subkey]
            }
          })
          let item = { seqId: seqId, congestion: congestion, etlDt: etlDt }
          resData.push(item)
        })

        // Local data와 API congestion data 와 merge 작업
        if(resData.length > 0) {
          let mergeData = storageData.map(function (storage) {
            let target = resData.filter(function(res) {
              return res.seqId == storage.seqId
            })
            storage.congestion = target[0].congestion
            storage.etlDt = target[0].etlDt
      
            return storage
          })
          this.setState({mergeData: mergeData})
        }
        this.showMarkerFilterZoomGroup(1, LATITUDE, LONGITUDE)
      })
      .catch((error) => console.error(error))
      .finally(() => console.log(url)); // this.setState({isLoading: false})
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({isPopup: false})
    }, 2500)

    // 해수욕장 정보 API
    // https://www.tournmaster.com/seantour_map/travel/beachinfo.do
    // 
    /** 
     * ex)
      {
        "Jnumber233": {
          "seqId": 233,
          "capacity": 7500,
          "area": 30000,
          "beachName": "월정",
          "length": 300,
          "width": 100,
          "areaName": "제주특별자치도",
          "areaName2": "제주시"
        },
      }
     */

    // 해수욕장 혼잡도 API
    // https://www.tournmaster.com/seantour_map/travel/getBeachCongestionApi.do
    // etlDt : 년도/월/일/시간
    // seqId : 해수욕장 번호
    // poiNm : 해수욕장 이름
    // uniqPop : 인원수
    // congestion : 해수욕장 혼잡 수치 (1-보통 2-조금 혼잡 3-매우 혼잡)
    /**
     * ex)
      {
        "Beach232": {
          "etlDt": "202107281600",
          "seqId": 233,
          "poiNm": "월정",
          "uniqPop": 1048,
          "congestion": "1"
        },
      }
     */
    this.requestApi()
  }

  /*
        ca-app-pub-8932745447223637/1265858632
        <View style={{ width: width, height: 50, backgroundColor: Colors.white, position: 'absolute', bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <BannerAd
            unitId={TestIds.BANNER}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={function() {
              console.log('Advert loaded');
            }}
            onAdFailedToLoad={function(error) {
              console.error('Advert failed to load: ', error);
            }}
          />
        </View>
  */

  render() {
    return (
      <View style={styles.container}>
        <MapView 
          provider={this.props.provider}
          style={styles.map}
          initialRegion={this.state.region}
          onRegionChangeComplete={this.onRegionChangeComplete}
        >
          {this.state.markers.map(marker => (
            <Marker
              key={marker.seqId}
              coordinate={{latitude: marker.latitude, longitude: marker.longitude}}
              //pinColor={marker.congestion == 1 ? Colors.green : marker.congestion == 2 ? Colors.yellow : Colors.red}
            >
              <BeachMarker key={'marker_'+marker.seqId} beach={marker} />
              <BeachCallout key={'callout'+marker.seqId} beach={marker} />
            </Marker>
          ))}
        </MapView>
        {this.state.isPopup == true ? 
        <View style={{ width: width/2, height: 200, backgroundColor: Colors.white, position: 'absolute', top: 200, alignItems: 'center', justifyContent: 'center', borderRadius: 10, opacity: 0.9 }}>
          <Text style={{ fontSize: 16 }}>화면을 확대하시면</Text>
          <Text style={{ fontSize: 16, margin: 6 }}>더 많은 해수욕장이</Text>
          <Text style={{ fontSize: 16 }}>보입니다.</Text>
        </View> : <View></View>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    //marginBottom: 50,
  },
  marker: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderRadius: 4,
    opacity: 0.9,
    paddingLeft: 4,
    paddingRight: 4,
  },
  markerFont: {
    fontSize: 10,
  },
  callout: {
    width: 180,
    padding: 2,
  },
  calloutText: {
    fontSize: 12,
  },
});

export default Map;