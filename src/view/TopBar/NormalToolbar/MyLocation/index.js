import React from "react";
import { geolocated } from "react-geolocated";
import Button from './Button';

export default geolocated({
    positionOptions: {
        enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
})(Button);
