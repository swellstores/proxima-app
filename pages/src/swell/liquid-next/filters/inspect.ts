import { LiquidSwell } from "..";
//import util from "util";

// {{ any_value | inspect }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (variable: any) => {
    console.log(variable);
    return '';
    //return util.inspect(variable, false, null);
  };
}
