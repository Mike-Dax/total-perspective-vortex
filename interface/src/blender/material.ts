export interface MaterialJSON {
  type: "color";
  color: [number, number, number, number];
}

export const blankMaterial: MaterialJSON = {
  type: "color",
  color: [0, 0, 0, 0],
};
