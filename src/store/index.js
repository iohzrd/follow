import { store } from "quasar/wrappers";
import { createStore } from "vuex";

// import example from './module-example'

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

export default store(function (/* { ssrContext } */) {
  const Store = createStore({
    state: { ipfs_id: {}, identities: {} },
    mutations: {
      setIpfsId(state, payload) {
        state.ipfs_id = payload;
      },
      setIdentity(state, identity) {
        state.identities[identity["publisher"]] = identity;
      },
      setIdentites(state, identities) {
        console.log("setIdentites");
        console.log(identities);
        state.identities = identities;
      },
    },
  });

  return Store;
});
