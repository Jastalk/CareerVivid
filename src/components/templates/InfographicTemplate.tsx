
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, User, Briefcase, GraduationCap, Star } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const InfographicTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;
  
  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  const getSkillWidth = (level: string) => {
    switch(level) {
      case 'Novice': return 'w-1/4';
      case 'Intermediate': return 'w-2/4';
      case 'Advanced': return 'w-3/4';
      case 'Expert': return 'w-full';
      default: return 'w-2/4';
    }
  };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 bg-gray-100 p-6 flex flex-col items-center">
        {personalDetails.photo && (
          <div className="w-32 h-32 rounded-full mb-4 overflow-hidden flex items-center justify-center">
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-col items-center gap-1 text-center">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-2xl font-bold text-gray-800" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-2xl font-bold text-gray-800" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-md text-gray-600 text-center" 
            style={titleStyle}
            tagName="p"
            placeholder="Job Title"
        />
        
        <div className="w-full my-6 border-t border-gray-300"></div>

        <section className="w-full mb-6">
          <h2 className="text-sm font-bold uppercase mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>CONTACT</h2>
          <div className="space-y-2 text-xs text-gray-800">
            <div className="flex"><Mail size={14} className="mr-2 shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" /></div>
            <div className="flex"><Phone size={14} className="mr-2 shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /></div>
            <div className="flex"><MapPin size={14} className="mr-2 shrink-0 transform translate-y-px" /><InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" /></div>
          </div>
        </section>
        
        <section className="w-full">
          <h2 className="text-sm font-bold uppercase mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>SKILLS</h2>
          <div className="space-y-3">
            {skills.map((skill, index) => (
              <div key={skill.id}>
                <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" className="text-xs font-semibold text-gray-800 block mb-1" />
                <div className="w-full bg-gray-300 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${getSkillWidth(skill.level)}`} style={{backgroundColor: themeColor, color: inkOn(themeColor)}}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="w-2/3 p-8">
        <section className="mb-6">
          <div className="flex items-center mb-3">
            <div className="text-white rounded-full p-2 mr-3" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}><User size={20} /></div>
            <h2 className="text-xl font-bold uppercase text-gray-800" style={titleStyle}>Profile</h2>
          </div>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed text-gray-700 block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <div className="flex items-center mb-3">
            <div className="text-white rounded-full p-2 mr-3" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}><Briefcase size={20} /></div>
            <h2 className="text-xl font-bold uppercase text-gray-800" style={titleStyle}>Experience</h2>
          </div>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4 pl-10 relative">
              <div className="absolute left-2 top-0 h-full w-0.5 bg-gray-200"></div>
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}></div>
              <div className="flex gap-1 text-xs font-bold text-gray-600">
                  <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-md font-bold text-gray-800 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <InlineEdit 
                value={job.employer} 
                fieldId={`employmentHistory[${index}].employer`} 
                onFocus={onFocus} 
                className="text-sm italic text-gray-600 block" 
                tagName="p"
                placeholder="Employer"
              />
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-1 leading-relaxed whitespace-pre-wrap text-gray-700 block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section>
          <div className="flex items-center mb-3">
            <div className="text-white rounded-full p-2 mr-3" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}><GraduationCap size={20} /></div>
            <h2 className="text-xl font-bold uppercase text-gray-800" style={titleStyle}>Education</h2>
          </div>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4 pl-10 relative">
              <div className="absolute left-2 top-0 h-full w-0.5 bg-gray-200"></div>
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}></div>
               <div className="flex gap-1 text-xs font-bold text-gray-600">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="font-bold text-md text-gray-800 block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Degree"
              />
              <InlineEdit 
                value={edu.school} 
                fieldId={`education[${index}].school`} 
                onFocus={onFocus} 
                className="text-sm italic text-gray-600 block" 
                tagName="p"
                placeholder="School"
              />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
