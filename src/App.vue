<style lang="scss">
@import "assets/css/style.scss";
</style>

<script>
import { mapGetters } from "vuex";
import Board from "@/components/Board.vue";
import Center from "@/components/Center.vue";
import Chance from "@/components/Chance.vue";
import CommunityChest from "@/components/CommunityChest.vue";
import Electric from "@/components/Electric.vue";
import Go from "@/components/Go.vue";
import GoToJail from "@/components/GoToJail.vue";
import IncomeTax from "@/components/IncomeTax.vue";
import Jail from "@/components/Jail.vue";
import LuxuryTax from "@/components/LuxuryTax.vue";
import Parking from "@/components/Parking.vue";
import Property from "@/components/Property.vue";
import Railroad from "@/components/Railroad.vue";
import WaterWorks from "@/components/WaterWorks.vue";

export default {
  name: "App",
  components: {
    Board,
    Center,
    Chance,
    CommunityChest,
    Electric,
    Go,
    GoToJail,
    IncomeTax,
    Jail,
    LuxuryTax,
    Parking,
    Property,
    Railroad,
    WaterWorks
  },
  computed: {
    ...mapGetters({
      spaces: "getSpaces"
    })
  },
  data() {
    return {
      elements: []
    };
  },
  render(createElement) {
    this.elements = this.spaces.map((space, index) => {
      if (index % 5 === 0) {
        if (index % 10 === 0) {
          switch (space) {
            case "Go":
              return createElement(Go);
            case "Jail":
              return createElement(Jail);
            case "Free Parking":
              return createElement(Parking);
            case "Go to Jail":
              return createElement(GoToJail);
            default:
          }
        } else {
          return createElement(Railroad, { props: { name: space } });
        }
      }
      switch (space) {
        case "Chance":
          return createElement(Chance);
        case "Community Chest":
          return createElement(CommunityChest);
        case "Electric Company":
          return createElement(Electric);
        case "Waterworks":
          return createElement(WaterWorks);
        case "Luxury Tax":
          return createElement(LuxuryTax);
        case "Income Tax":
          return createElement(IncomeTax);
        default:
          return createElement(Property, { props: { name: space } });
      }
    });
    const south = createElement(
      "div",
      {
        class: "row horizontal-row bottom-row"
      },
      this.elements.slice(1, 10).reverse()
    );
    const west = createElement(
      "div",
      {
        class: "row vertical-row left-row"
      },
      this.elements.slice(11, 20).reverse()
    );
    const north = createElement(
      "div",
      {
        class: "row horizontal-row top-row"
      },
      this.elements.slice(21, 30)
    );
    const east = createElement(
      "div",
      {
        class: "row vertical-row right-row"
      },
      this.elements.slice(31, 40)
    );
    const center = createElement(Center);
    const go = this.elements[0];
    const jail = this.elements[10];
    const parking = this.elements[20];
    const gotojail = this.elements[30];

    return createElement(Board, { props: { elements: this.elements } }, [
      center,
      go,
      south,
      jail,
      west,
      parking,
      north,
      gotojail,
      east
    ]);
  }
};
</script>

<style>
@import "./assets/css/app.css";
</style>