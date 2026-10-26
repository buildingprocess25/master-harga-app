import { configureStore } from "@reduxjs/toolkit";
import cabangReducer from "./slices/cabangSlice";
import kontraktorReducer from "./slices/kontraktorSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      cabang: cabangReducer,
      kontraktor: kontraktorReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
