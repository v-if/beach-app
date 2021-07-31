import React from 'react';
import { View, Image } from 'react-native';
import SplashScreen from 'react-native-splash-screen'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Map } from './components';

const Stack = createStackNavigator();

export default function App() {

  // 0.5초 뒤 Splash 닫기
  setTimeout(() => {
    SplashScreen.hide()
  }, 500);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Map">
        <Stack.Screen 
          name="Map" 
          component={Map} 
          options={({ navigation, route }) => ({
            title: '해수욕장 신호등',
            headerLeft: () => (
              <View style={{
                marginLeft: 10,
                }}
              >
                <Image
                  style={{width: 36, height: 36}}
                  source={require('./components/images/icon.png')}
                />
              </View>
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
