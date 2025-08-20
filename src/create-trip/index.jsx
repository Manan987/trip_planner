import { AI_PROMPT, SelectBudgetOptions, SelectTravelList } from '@/constants/options'
import React, { useEffect, useState } from 'react'
// import GooglePlacesAutocomplete from 'react-google-places-autocomplete'
import PlaceAutocomplete from '@/components/custom/PlaceAutocomplete'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { chatSession } from '@/service/aiModel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FcGoogle } from "react-icons/fc";
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useNavigate } from 'react-router-dom';

function CreateTrip() {

  const [place, setPlace] = useState();

  const [formData, setFormData] = useState({});

  const [openDialog, setOpenDialog] = useState(false);

  const[loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    })
  }

  useEffect(() => {
    console.log('Form Data Updated:', formData);
    
    // Debug Firebase config on component mount
    if (Object.keys(formData).length === 0) {
      console.log('Environment Variables Check:');
      console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? 'Loaded' : 'Missing');
      console.log('Gemini API Key:', import.meta.env.VITE_GEMINI_API_KEY ? 'Loaded' : 'Missing');
    }
  }, [formData])

  const login = useGoogleLogin({
    onSuccess: (codeRes) => GetUserProfile(codeRes),
    onError: (error) => console.log(error)
  })

  const OnGenerateTrip = async () => {

    const user = localStorage.getItem('user');

    if(!user) {
      setOpenDialog(true)
      return;
    }

    if (formData.location === undefined || formData.numberOfDays === undefined || formData.budget === undefined || formData.travelers === undefined) {
      toast('Please fill all the fields');
      return;
    }
    if (formData.numberOfDays <= 0) {
      toast('Please enter a valid number of days');
      return;
    }
    if (formData.numberOfDays > 30) {
      toast('Number of days should be less than or equal to 30');
      return;
    }

    setLoading(true);

    try {
      const FINAL_PROMPT = AI_PROMPT
        .replace('{location}', formData?.location?.label)
        .replace('{totalDays}', formData?.numberOfDays)
        .replace('{travelers}', formData?.travelers)
        .replace('{budget}', formData?.budget);

      const result = await chatSession.sendMessage(FINAL_PROMPT);

      console.log("AI Response:", result?.response?.text());

      if (result?.response?.text()) {
        SaveTrip(result?.response?.text());
      } else {
        throw new Error('No response from AI');
      }

    } catch (error) {
      console.error('Error generating trip:', error);
      setLoading(false);
      toast('Error generating trip. Please try again.');
    }
  }

  const SaveTrip = async (TripData) => {

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const docId = Date.now().toString();

      // Parse and validate the trip data
      let parsedTripData;
      try {
        parsedTripData = JSON.parse(TripData);
      } catch (parseError) {
        console.error('Error parsing trip data:', parseError);
        toast('Error processing trip data');
        setLoading(false);
        return;
      }

      const tripDocument = {
        userPreference: formData,
        tripData: parsedTripData,
        userEmail: user?.email,
        id: docId,
        createdAt: new Date().toISOString()
      };

      try {
        // Try to save to Firebase
        await setDoc(doc(db, "AiTrips", docId), tripDocument);
        console.log('Trip saved to Firebase successfully');
        toast('Trip saved successfully!');
      } catch (firebaseError) {
        console.error('Firebase save failed:', firebaseError);
        
        // Fallback: Save to localStorage
        const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
        savedTrips.push(tripDocument);
        localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
        
        console.log('Trip saved to localStorage as fallback');
        toast('Trip generated! (Saved locally)');
      }

      setLoading(false);
      navigate(`/view-trip/${docId}`);

    } catch (error) {
      console.error('Error saving trip:', error);
      setLoading(false);
      toast('Error saving trip. Please try again.');
    }
  }

  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`, {
      headers:{
        Authorization: `Bearer ${tokenInfo?.access_token}`,
        Accept: 'application/json'
      }
    }).then((res)=> {
      console.log(res);
      localStorage.setItem('user', JSON.stringify(res.data));
      setOpenDialog(false);
      OnGenerateTrip();
    })
  }

  return (
    <div className='sm:px-10 md:px-14 lg:px-20 xl:px-24 px-5 m-10'>
      <h2 className='font-bold text-2xl sm:text-3xl'>Tell Us Your Travel Preferences 🌴</h2>
      <p className='mt-3 text-gray-500 sm:text-xl text-lg'>Just provide some basic information,
        and our trip planner will generate a customized itinerarybased on your preferences. </p>

      <div className='sm:m-10 m-5 flex flex-col gap-10'>
        <div>
          <h2 className='sm:text-xl text-base my-3 font-medium'>What is your Destination?</h2>

          {/* Free alternative using OpenStreetMap Nominatim API */}
          <PlaceAutocomplete
            value={place}
            onChange={(v) => { setPlace(v); handleInputChange('location', v) }}
            placeholder="Enter your destination (e.g., Tokyo, Japan)"
          />
          
          {/* Uncomment below when Google Places billing is enabled */}
          {/* <GooglePlacesAutocomplete
            apiKey={import.meta.env.VITE_GOOGLE_PLACE_API_KEY}
            selectProps={{
              place,
              onChange: (v) => { setPlace(v); handleInputChange('location', v) }
            }} className='w-full text-sm sm:text-base'
          /> */}
        </div>

        <div>
          <h2 className='sm:text-xl text-base my-3 font-medium'>How many days are you planning your travel?</h2>
          <Input placeholder='Enter the number of days' type='number' className='w-full text-sm sm:text-base'
          onChange={(e) => handleInputChange('numberOfDays', e.target.value)}
          />
        </div>

        <div>
          <h2 className='sm:text-xl text-base my-3 font-medium'>What is your Budget?</h2>
          <div className='grid sm:grid-cols-3 gap-5 mt-5'>
            {SelectBudgetOptions.map((item, index) => (
              <div key={index} 
              onClick={() => handleInputChange('budget', item.title)}
              className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg 
              ${formData.budget === item.title ? 'shadow-lg border-black' : ''}`}>
                <h2 className='sm:text-3xl text-xl'>{item.icon}</h2>
                <h2 className='font-bold sm:text-lg text-sm'>{item.title}</h2>
                <h2 className='sm:text-sm text-xs text-gray-500'>{item.desc}</h2>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className='sm:text-xl text-base my-3 font-medium'>Who do you plan on travelling with on your next adventure?</h2>
          <div className='grid sm:grid-cols-3 gap-5 mt-5'>
            {SelectTravelList.map((item, index) => (
              <div key={index} 
              onClick={() => handleInputChange('travelers', item.people)}
              className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg 
              ${formData.travelers === item.people ? 'shadow-lg border-black' : ''}`}>
                <h2 className='sm:text-3xl text-xl'>{item.icon}</h2>
                <h2 className='font-bold sm:text-lg text-sm'>{item.title}</h2>
                <h2 className='sm:text-xs text-xs text-gray-500'>{item.desc}</h2>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='justify-end flex my-10'>
        <Button onClick={OnGenerateTrip} disabled={loading}>
        {
          loading ? <AiOutlineLoading3Quarters className='animate-spin' /> : "Generate Trip"
        }
        </Button>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex justify-center items-center">
              <img src="/mainLogo.png" alt="Logo" />
            </DialogTitle>
            <DialogDescription className="flex flex-col justify-center items-center text-center mt-7">
              <span className="font-bold text-xl text-black">Login In or Sign Up</span>
              <span className="text-center">with Google Authentication Securely.</span>            
            </DialogDescription>
          </DialogHeader>
          <Button onClick={login} className="w-full my-5 flex gap-4 items-center justify-center rounded-full">
            <FcGoogle style={{ transform: 'scale(1.3)' }} />Continue with Google
          </Button>
          <DialogFooter className="text-xs text-center">
            <p>By logging in or signing up, you agree to WanderPathAI&apos;s<a href="" className='text-blue-600'> Terms & Conditions </a>and
            <a href="" className='text-blue-600'> Privacy Policy</a>.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default CreateTrip