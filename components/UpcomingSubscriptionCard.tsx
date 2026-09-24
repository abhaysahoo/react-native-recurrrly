import { formatCurrency } from "@/lib/utils";
import React from "react";
import { Image, Text, View } from "react-native";

const UpcomingSubscriptionCard = (props: UpcomingSubscriptionCardProps) => {
  return (
    <View className="upcoming-card">
      <View className="upcoming-row">
        <Image source={props.icon} className="upcoming-icon" />
        <View>
          <Text className="upcoming-price">
            {formatCurrency(props.price, "USD")}
          </Text>
          <Text className="upcoming-meta" numberOfLines={1}>
            {props.daysLeft > 1 ? `${props.daysLeft} days left` : "Last day"}
          </Text>
        </View>
      </View>

      <Text className="upcoming-name" numberOfLines={1}>
        {props.name}
      </Text>
    </View>
  );
};

export default UpcomingSubscriptionCard;
