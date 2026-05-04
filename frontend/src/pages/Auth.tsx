import { createClient } from "@/lib/supabase/client"





export default function Auth(){

  const supabase = createClient()

async function login(provider: "github" | "google"){
  const {data, error} = await supabase.auth.signInWithOAuth({
    provider: provider, 
  })

  if(error) {
    alert("error while signing in ")
  } else {
    alert("signed in")
  }
}

console.log(import.meta.env)

return <div>
    <button onClick={()=> login("google")}>login with google</button>
    <button onClick={()=> login("github")}>login with github</button>
</div>
}
