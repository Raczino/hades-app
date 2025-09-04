import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import Home from './components/routes/Home/Home.jsx';
import LogIn from './components/routes/LogIn/LogIn.jsx';
import Profile  from './components/routes/User/Profile.jsx';
import './App.css';
import ArticleList from "./components/routes/Articles/Articles.jsx";
import CreateArticleForm from "./components/Common/Forms/createArticle.jsx";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LogIn />,
  },
  {
    path: "/",
    element: <LogIn />,
  },
  {
    path: "/Home",
    element: <Home />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/articles",
    element: <ArticleList />,
  },
  {
    path: "/create",
    element: <CreateArticleForm />,
  }
]);

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <div className="App">
      <RouterProvider router={router} />
    </div>
  </QueryClientProvider>
  );
}

export default App;
