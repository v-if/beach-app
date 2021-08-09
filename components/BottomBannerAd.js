import React, { Component } from 'react';
import { Platform } from 'react-native';
import {BannerAd, BannerAdSize} from '@react-native-firebase/admob';

// https://rnfb-docs.netlify.app/admob/displaying-ads#banner-ads
const unitId =
  Platform.OS === 'ios'
    ? 'ca-app-pub-8932745447223637/2794864041'
    : 'ca-app-pub-8932745447223637/1265858632';


class BottomBannerAd extends Component {

  componentDidMount() {
    console.log('BottomBannerAd did mount');
  }

  render() {
    return (
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.SMART_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={function() {
          console.log('Advert loaded');
        }}
        onAdFailedToLoad={() => this.props.handler('failed')}
      />
    );
  }
}

export default BottomBannerAd;